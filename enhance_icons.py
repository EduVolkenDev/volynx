#!/usr/bin/env python3
"""Enhance transparent PNG/WebP icons without modifying the source files.

The default pipeline is deliberately conservative:

* resize premultiplied RGBA data with Lanczos to prevent matte halos;
* reinforce material density in RGB only, preserving the original alpha mask;
* apply a low-radius unsharp mask only inside the visible alpha region;
* write true RGBA PNG files with the original relative directory structure.

Real-ESRGAN is detected and reported when present, but this script does not
download model weights or install global dependencies. The portable fallback
is high-quality Pillow Lanczos with alpha-safe finishing.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional

try:
    from PIL import Image, ImageChops, ImageEnhance, ImageFilter, ImageMath, ImageStat
except ImportError as exc:  # pragma: no cover - user-facing dependency guard
    raise SystemExit(
        "Pillow is required. Install it in a local virtual environment with: "
        "python -m pip install Pillow"
    ) from exc


SUPPORTED_EXTENSIONS = {".png", ".webp"}
OUTPUT_SUFFIXES = ("-enhanced", "-enhanced-strong")


@dataclass(frozen=True)
class Settings:
    scale: float
    overlay_opacity: float
    second_overlay_opacity: float
    sharpness: float
    strong: bool


class UpscaleEngine:
    """Pillow fallback plus optional OpenCV EDSR super-resolution."""

    def __init__(
        self,
        kind: str,
        model_path: Optional[Path] = None,
        model_name: str = "edsr",
        binary_path: Optional[Path] = None,
        model_dir: Optional[Path] = None,
        tile_size: int = 256,
    ) -> None:
        self.kind = kind
        self.model_path = model_path
        self.model_name = model_name
        self.binary_path = binary_path
        self.model_dir = model_dir
        self.tile_size = tile_size
        self._sr = None
        self._cv2 = None
        self._np = None
        self._tile_core = 512
        self._tile_overlap = 32
        if kind == "realesrgan":
            if binary_path is None or not binary_path.is_file():
                raise SystemExit(f"Real-ESRGAN binary not found: {binary_path}")
            if model_dir is None or not model_dir.is_dir():
                raise SystemExit(f"Real-ESRGAN model directory not found: {model_dir}")
            return
        if kind == "edsr":
            try:
                import cv2  # type: ignore
                import numpy as np  # type: ignore
            except ImportError as exc:
                raise SystemExit(
                    "EDSR requires local OpenCV and NumPy. Install them in the venv with "
                    "python -m pip install opencv-contrib-python-headless"
                ) from exc
            if model_path is None or not model_path.is_file():
                raise SystemExit(f"EDSR model file not found: {model_path}")
            self._sr = cv2.dnn_superres.DnnSuperResImpl_create()
            self._sr.readModel(str(model_path))
            self._sr.setModel(model_name, 4)
            self._cv2 = cv2
            self._np = np

    @property
    def label(self) -> str:
        if self.kind == "realesrgan":
            return f"Real-ESRGAN NCNN Vulkan {self.model_name} x4 tiled (binary: {self.binary_path}) with premultiplied RGBA alpha-safe processing"
        if self.kind == "edsr":
            return f"OpenCV {self.model_name.upper()} x4 tiled (model: {self.model_path}) with premultiplied RGBA alpha-safe processing"
        return "Pillow Lanczos (premultiplied RGBA alpha-safe fallback; Real-ESRGAN unavailable)"

    def resize(self, image: Image.Image, size: tuple[int, int]) -> Image.Image:
        if self.kind == "pillow":
            return premultiplied_resize(image, size)
        if self.kind == "realesrgan":
            return self._realesrgan_resize(image, size)
        return self._edsr_resize(image, size)

    def _realesrgan_resize(self, image: Image.Image, size: tuple[int, int]) -> Image.Image:
        """Run the portable Real-ESRGAN binary on premultiplied RGB only."""
        rgba = image.convert("RGBA")
        alpha = rgba.getchannel("A")
        premultiplied = ImageChops.multiply(rgba.convert("RGB"), alpha.convert("RGB"))
        with tempfile.TemporaryDirectory(prefix="volynx-realesrgan-") as temp_dir:
            temp_path = Path(temp_dir)
            input_path = temp_path / "premultiplied-rgb.png"
            output_path = temp_path / "realesrgan-rgb.png"
            premultiplied.save(input_path, format="PNG", compress_level=0)
            command = [
                str(self.binary_path),
                "-i",
                str(input_path),
                "-o",
                str(output_path),
                "-s",
                "4",
                "-t",
                str(self.tile_size),
                "-m",
                str(self.model_dir),
                "-n",
                self.model_name,
                "-f",
                "png",
            ]
            completed = subprocess.run(
                command,
                check=False,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
            )
            if completed.returncode != 0 or not output_path.exists():
                raise RuntimeError(
                    "Real-ESRGAN failed with code "
                    f"{completed.returncode}: {completed.stdout[-2000:]}"
                )
            with Image.open(output_path) as enhanced_file:
                enhanced_rgb = enhanced_file.convert("RGB")
                if enhanced_rgb.size != size:
                    enhanced_rgb = enhanced_rgb.resize(size, Image.Resampling.LANCZOS)

            resized_alpha = alpha.resize(size, Image.Resampling.LANCZOS)
            safe_alpha = ImageMath.lambda_eval(
                lambda values: values["convert"](
                    values["a"] + (values["a"] == 0), "L"
                ),
                a=resized_alpha,
            )
            channels = [
                ImageMath.lambda_eval(
                    lambda values: values["convert"](
                        values["p"] * 255 / values["a"], "L"
                    ),
                    p=channel,
                    a=safe_alpha,
                )
                for channel in enhanced_rgb.split()
            ]
            output = Image.merge("RGB", tuple(channels)).convert("RGBA")
            output.putalpha(resized_alpha)
            # Real-ESRGAN can hallucinate dark/chromatic pixels immediately
            # outside a transparent silhouette. Keep the neural result in the
            # opaque interior, and feather back to the alpha-safe Lanczos edge
            # so physical contours stay clean without visible halos.
            base_edge = premultiplied_resize(rgba, size)
            solid_core = resized_alpha.point(lambda value: 255 if value >= 245 else 0)
            solid_core = solid_core.filter(ImageFilter.MinFilter(33)).filter(
                ImageFilter.GaussianBlur(5)
            )
            blended_rgb = Image.composite(
                output.convert("RGB"), base_edge.convert("RGB"), solid_core
            )
            blended = blended_rgb.convert("RGBA")
            blended.putalpha(resized_alpha)
            return blended

    def _edsr_resize(self, image: Image.Image, size: tuple[int, int]) -> Image.Image:
        assert self._sr is not None and self._cv2 is not None and self._np is not None
        cv2 = self._cv2
        np = self._np
        rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
        alpha = rgba[:, :, 3]
        rgb = rgba[:, :, :3].astype(np.float32)
        premultiplied = np.clip(
            np.round(rgb * (alpha[:, :, None].astype(np.float32) / 255.0)),
            0,
            255,
        ).astype(np.uint8)
        bgr = cv2.cvtColor(premultiplied, cv2.COLOR_RGB2BGR)
        upscaled_bgr = self._edsr_tiled(bgr)
        upscaled_rgb = cv2.cvtColor(upscaled_bgr, cv2.COLOR_BGR2RGB)
        if (upscaled_rgb.shape[1], upscaled_rgb.shape[0]) != size:
            upscaled_rgb = cv2.resize(
                upscaled_rgb, size, interpolation=cv2.INTER_LANCZOS4
            )

        alpha_image = image.convert("RGBA").getchannel("A").resize(
            size, Image.Resampling.LANCZOS
        )
        upscaled_alpha = np.asarray(alpha_image, dtype=np.uint8)
        alpha_float = upscaled_alpha.astype(np.float32)
        restored = np.zeros_like(upscaled_rgb, dtype=np.float32)
        np.divide(
            upscaled_rgb.astype(np.float32) * 255.0,
            alpha_float[:, :, None],
            out=restored,
            where=alpha_float[:, :, None] > 0,
        )
        restored = np.clip(np.round(restored), 0, 255).astype(np.uint8)
        return Image.fromarray(np.dstack((restored, upscaled_alpha)), mode="RGBA")

    def _edsr_tiled(self, bgr: Any) -> Any:
        """Run EDSR in overlapping tiles to cap peak memory on large icons."""
        assert self._sr is not None and self._cv2 is not None and self._np is not None
        cv2 = self._cv2
        np = self._np
        scale = 4
        height, width = bgr.shape[:2]
        output = np.empty((height * scale, width * scale, 3), dtype=np.uint8)
        core = self._tile_core
        overlap = self._tile_overlap
        for core_y in range(0, height, core):
            core_y_end = min(core_y + core, height)
            tile_y = max(0, core_y - overlap)
            tile_y_end = min(height, core_y_end + overlap)
            for core_x in range(0, width, core):
                core_x_end = min(core_x + core, width)
                tile_x = max(0, core_x - overlap)
                tile_x_end = min(width, core_x_end + overlap)
                tile = bgr[tile_y:tile_y_end, tile_x:tile_x_end]
                tile_sr = self._sr.upsample(tile)
                expected_tile_size = ((tile_x_end - tile_x) * scale, (tile_y_end - tile_y) * scale)
                if (tile_sr.shape[1], tile_sr.shape[0]) != expected_tile_size:
                    tile_sr = cv2.resize(
                        tile_sr, expected_tile_size, interpolation=cv2.INTER_LANCZOS4
                    )
                crop_left = (core_x - tile_x) * scale
                crop_top = (core_y - tile_y) * scale
                crop_right = crop_left + (core_x_end - core_x) * scale
                crop_bottom = crop_top + (core_y_end - core_y) * scale
                output[
                    core_y * scale : core_y_end * scale,
                    core_x * scale : core_x_end * scale,
                ] = tile_sr[crop_top:crop_bottom, crop_left:crop_right]
        return output


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create alpha-safe, premium 4x-enhanced PNG icon variants."
    )
    parser.add_argument("--input", required=True, type=Path, help="Input icon folder")
    parser.add_argument("--output", required=True, type=Path, help="Output folder")
    parser.add_argument("--scale", type=float, default=4.0)
    parser.add_argument("--overlay-opacity", type=float, default=0.16)
    parser.add_argument("--second-overlay-opacity", type=float, default=0.07)
    parser.add_argument(
        "--sharpness",
        type=float,
        default=0.8,
        help="Unsharp strength multiplier; 0 disables sharpening",
    )
    parser.add_argument(
        "--strong",
        action="store_true",
        help="Use the stronger profile for the regular -enhanced.png output too",
    )
    parser.add_argument(
        "--upscaler",
        choices=("auto", "pillow", "edsr", "realesrgan"),
        default="auto",
        help="Upscaler engine; auto uses the selected model when supplied",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=None,
        help="OpenCV EDSR_x4.pb model path for --upscaler edsr",
    )
    parser.add_argument(
        "--model-name",
        choices=("edsr", "fsrcnn"),
        default="edsr",
        help="OpenCV super-resolution model family",
    )
    parser.add_argument(
        "--binary",
        type=Path,
        default=None,
        help="Portable Real-ESRGAN NCNN Vulkan executable",
    )
    parser.add_argument(
        "--model-dir",
        type=Path,
        default=None,
        help="Real-ESRGAN directory containing .param and .bin model files",
    )
    parser.add_argument(
        "--tile-size",
        type=int,
        default=256,
        help="Real-ESRGAN tile size; lower values reduce peak memory",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Process only the first N files (useful for a sample run)",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Allow replacing existing files inside the output folder",
    )
    return parser.parse_args()


def validate_args(args: argparse.Namespace) -> None:
    if not args.input.is_dir():
        raise SystemExit(f"Input folder does not exist or is not a directory: {args.input}")
    if args.scale <= 0:
        raise SystemExit("--scale must be greater than zero")
    for name in ("overlay_opacity", "second_overlay_opacity"):
        value = getattr(args, name)
        if not 0 <= value <= 1:
            raise SystemExit(f"--{name.replace('_', '-')} must be between 0 and 1")
    if args.sharpness < 0:
        raise SystemExit("--sharpness must be zero or greater")
    if args.tile_size < 32:
        raise SystemExit("--tile-size must be at least 32")
    if args.limit is not None and args.limit <= 0:
        raise SystemExit("--limit must be greater than zero when supplied")

    input_path = args.input.resolve()
    output_path = args.output.resolve()
    if input_path == output_path:
        raise SystemExit("Input and output must be different folders")
    if output_path.exists() and output_path.is_file():
        raise SystemExit(f"Output path is a file, not a folder: {output_path}")


def discover_files(input_dir: Path, output_dir: Path, limit: Optional[int]) -> list[Path]:
    output_resolved = output_dir.resolve()
    files: list[Path] = []
    for path in sorted(input_dir.rglob("*"), key=lambda item: str(item).casefold()):
        if not path.is_file() or path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        # Protect against a future invocation where output is nested in input.
        try:
            path.resolve().relative_to(output_resolved)
            continue
        except ValueError:
            pass
        if any(path.stem.casefold().endswith(suffix) for suffix in OUTPUT_SUFFIXES):
            continue
        files.append(path)
        if limit is not None and len(files) >= limit:
            break
    return files


def optional_upscaler_name() -> str:
    try:
        import realesrgan  # type: ignore  # noqa: F401

        return "Real-ESRGAN package detected (not selected: no model/weights were supplied)"
    except Exception:
        return "Pillow Lanczos (premultiplied RGBA alpha-safe fallback; Real-ESRGAN unavailable)"


def build_upscale_engine(args: argparse.Namespace) -> UpscaleEngine:
    kind = args.upscaler
    if kind == "auto":
        if args.binary is not None:
            kind = "realesrgan"
        elif args.model is not None:
            kind = "edsr"
        else:
            kind = "pillow"
    if kind == "realesrgan":
        return UpscaleEngine(
            "realesrgan",
            model_name="realesrgan-x4plus",
            binary_path=args.binary.resolve() if args.binary else None,
            model_dir=args.model_dir.resolve() if args.model_dir else None,
            tile_size=args.tile_size,
        )
    if kind == "edsr":
        return UpscaleEngine(
            "edsr",
            args.model.resolve() if args.model else None,
            args.model_name,
        )
    return UpscaleEngine("pillow")


def copy_metadata(source: Image.Image) -> dict[str, Any]:
    """Keep portable metadata without copying decoder-only internal fields."""
    metadata: dict[str, Any] = {}
    for key in ("icc_profile", "exif", "dpi", "gamma", "srgb", "xmp", "comment"):
        value = source.info.get(key)
        if value is not None:
            metadata[key] = value
    return metadata


def resized_size(size: tuple[int, int], scale: float) -> tuple[int, int]:
    width = max(1, int(round(size[0] * scale)))
    height = max(1, int(round(size[1] * scale)))
    return width, height


def premultiplied_resize(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize RGBA without sampling hidden RGB from transparent pixels."""
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    alpha = rgba.getchannel("A")

    # Multiply RGB by alpha before interpolation. This prevents white/black
    # matte pixels in transparent areas from bleeding into the object edge.
    premultiplied = ImageChops.multiply(rgb, alpha.convert("RGB"))
    resized_pm = premultiplied.resize(size, Image.Resampling.LANCZOS)
    resized_alpha = alpha.resize(size, Image.Resampling.LANCZOS)

    # Un-premultiply only visible pixels. ImageMath performs this per channel
    # without a Python loop, which is important for 4x images with millions of
    # pixels. Fully transparent RGB is kept black and alpha remains separate.
    safe_alpha = ImageMath.lambda_eval(
        lambda values: values["convert"](
            values["a"] + (values["a"] == 0), "L"
        ),
        a=resized_alpha,
    )
    channels = []
    for channel in resized_pm.split():
        channels.append(
            ImageMath.lambda_eval(
                lambda values: values["convert"](
                    values["p"] * 255 / values["a"], "L"
                ),
                p=channel,
                a=safe_alpha,
            )
        )
    output = Image.merge("RGB", tuple(channels)).convert("RGBA")
    output.putalpha(resized_alpha)
    return output


def visible_mask(alpha: Image.Image, threshold: int = 2) -> Image.Image:
    """Softly exclude fully transparent pixels from color/sharpen operations."""
    return alpha.point(lambda value: 0 if value < threshold else value)


def blend_rgb_only(base: Image.Image, overlay: Image.Image, opacity: float) -> Image.Image:
    """Blend color while preserving base alpha exactly."""
    if opacity <= 0:
        return base.copy()
    base_rgba = base.convert("RGBA")
    overlay_rgba = overlay.convert("RGBA")
    base_rgb = base_rgba.convert("RGB")
    overlay_rgb = overlay_rgba.convert("RGB")
    blended_rgb = Image.blend(base_rgb, overlay_rgb, opacity)
    result = blended_rgb.convert("RGBA")
    result.putalpha(base_rgba.getchannel("A"))
    return result


def material_density_layer(image: Image.Image, amount: float) -> Image.Image:
    """Make a subtle detail-bearing duplicate without altering transparency."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    # A restrained local contrast lift is intentionally below the later
    # unsharp pass. It gives the duplicate layer a purpose without duplicating
    # contours or making identical alpha layers harder.
    enhanced = ImageEnhance.Contrast(rgb).enhance(1.0 + amount)
    enhanced.putalpha(alpha)
    return enhanced


def sharpen_visible(image: Image.Image, strength: float, strong: bool) -> Image.Image:
    if strength <= 0:
        return image
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    rgb = rgba.convert("RGB")
    # Radius stays low to favor internal material detail over cartoon-like
    # outlines. Percentage is conservative even when --sharpness is 1.0.
    radius = 0.55 if not strong else 0.65
    percent = max(1, min(90, int(round(34 * strength * (1.12 if strong else 1.0)))))
    threshold = 3 if not strong else 2
    sharpened = rgb.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=threshold))
    mask = visible_mask(alpha)
    result_rgb = Image.composite(sharpened, rgb, mask)
    result = result_rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def reinforce(image: Image.Image, settings: Settings, strong: bool) -> Image.Image:
    """Compose aligned density copies while retaining the original alpha."""
    result = image.copy()
    overlay_opacity = settings.overlay_opacity + (0.02 if strong else 0.0)
    second_opacity = settings.second_overlay_opacity + (0.02 if strong else 0.0)
    layer = material_density_layer(result, 0.035 if not strong else 0.055)
    result = blend_rgb_only(result, layer, overlay_opacity)
    if second_opacity > 0:
        second_layer = material_density_layer(result, 0.018 if not strong else 0.028)
        result = blend_rgb_only(result, second_layer, second_opacity)
    return sharpen_visible(result, settings.sharpness, strong)


def alpha_stats(image: Image.Image) -> dict[str, Any]:
    alpha = image.convert("RGBA").getchannel("A")
    extrema = alpha.getextrema()
    histogram = alpha.histogram()
    return {
        "min": extrema[0],
        "max": extrema[1],
        "transparent_pixels": histogram[0],
        "partial_alpha_pixels": sum(histogram[1:255]),
        "opaque_pixels": histogram[255],
    }


def color_stats(image: Image.Image) -> tuple[float, float, float]:
    rgb = image.convert("RGBA").convert("RGB")
    stat = ImageStat.Stat(rgb)
    return tuple(round(value, 3) for value in stat.mean[:3])


def save_png(image: Image.Image, target: Path, metadata: dict[str, Any]) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    save_kwargs: dict[str, Any] = {
        "format": "PNG",
        "compress_level": 6,
        "optimize": False,
    }
    save_kwargs.update(metadata)
    # Explicit RGBA prevents indexed PNG output and preserves partial alpha.
    try:
        image.convert("RGBA").save(target, **save_kwargs)
    except (TypeError, ValueError):
        # Some metadata keys are format/decoder-specific. Keep the actual
        # pixels and portable color metadata even if a source tag is rejected.
        safe_kwargs = {
            key: value
            for key, value in metadata.items()
            if key in {"icc_profile", "exif", "dpi", "gamma", "srgb"}
        }
        save_kwargs = {"format": "PNG", "compress_level": 6, "optimize": False}
        save_kwargs.update(safe_kwargs)
        image.convert("RGBA").save(target, **save_kwargs)


def process_one(
    source_path: Path,
    input_dir: Path,
    output_dir: Path,
    settings: Settings,
    overwrite: bool,
    engine: UpscaleEngine,
) -> dict[str, Any]:
    relative = source_path.relative_to(input_dir)
    relative_png = relative.with_suffix("")
    balanced_path = output_dir / relative_png.parent / f"{relative_png.name}-enhanced.png"
    strong_path = output_dir / relative_png.parent / f"{relative_png.name}-enhanced-strong.png"
    targets = (balanced_path, strong_path)
    if not overwrite and any(path.exists() for path in targets):
        raise FileExistsError(
            "Output already exists; use --overwrite only when replacing generated output is intended"
        )

    started = time.perf_counter()
    with Image.open(source_path) as opened:
        opened.load()
        original = opened.convert("RGBA")
        metadata = copy_metadata(opened)
        before_size = original.size
        after_size = resized_size(before_size, settings.scale)
        before_alpha = alpha_stats(original)
        before_color = color_stats(original)
        upscaled = engine.resize(original, after_size)
        balanced = reinforce(upscaled, settings, strong=False)
        strong = reinforce(upscaled, settings, strong=True)
        after_alpha_balanced = alpha_stats(balanced)
        after_alpha_strong = alpha_stats(strong)
        save_png(balanced, balanced_path, metadata)
        save_png(strong, strong_path, metadata)
        del original, upscaled, balanced, strong

    return {
        "source": str(relative),
        "balanced_output": str(balanced_path.relative_to(output_dir)),
        "strong_output": str(strong_path.relative_to(output_dir)),
        "before": {"width": before_size[0], "height": before_size[1]},
        "after": {"width": after_size[0], "height": after_size[1]},
        "before_alpha": before_alpha,
        "after_alpha_balanced": after_alpha_balanced,
        "after_alpha_strong": after_alpha_strong,
        "before_mean_rgb": before_color,
        "seconds": round(time.perf_counter() - started, 2),
    }


def write_report(
    output_dir: Path,
    input_dir: Path,
    files: list[Path],
    processed: list[dict[str, Any]],
    errors: list[dict[str, str]],
    settings: Settings,
    method: str,
    elapsed: float,
) -> Path:
    report = output_dir / "enhancement-report.txt"
    lines = [
        "ICON ENHANCEMENT REPORT",
        "========================",
        f"Generated (UTC): {datetime.now(timezone.utc).isoformat()}",
        f"Input folder: {input_dir}",
        f"Final output folder: {output_dir}",
        f"Files found for this run: {len(files)}",
        f"Files processed: {len(processed)} source files ({len(processed) * 2} PNG outputs)",
        f"Files with errors: {len(errors)}",
        f"Runtime: {elapsed:.2f} seconds",
        "",
        "METHOD",
        "------",
        f"Upscale: {method}",
        f"Scale: {settings.scale:g}x",
        "Color pipeline: RGBA converted to premultiplied RGB + alpha before upscale; alpha restored unchanged after finishing",
        "Export: true RGBA PNG, 8 bits/channel, non-indexed, compression level 6",
        "",
        "FINISHING PARAMETERS",
        "--------------------",
        f"Primary overlay opacity: {settings.overlay_opacity:.3f}",
        f"Second overlay opacity: {settings.second_overlay_opacity:.3f}",
        f"Sharpness input: {settings.sharpness:.3f}",
        "Unsharp mask: radius 0.55 px, 34% x sharpness, threshold 3 (balanced)",
        "Unsharp mask: radius 0.65 px, 38% x sharpness, threshold 2 (strong)",
        "Overlay layers: exactly aligned, RGB-only blend; base alpha preserved to avoid hardening soft transparency",
        "",
        "DIMENSIONS",
        "----------",
    ]
    for item in processed:
        lines.append(
            f"{item['source']} | {item['before']['width']}x{item['before']['height']} -> "
            f"{item['after']['width']}x{item['after']['height']} | {item['seconds']:.2f}s"
        )
    if errors:
        lines.extend(["", "ERRORS", "------"])
        lines.extend(f"{item['source']} | {item['error']}" for item in errors)
    else:
        lines.extend(["", "ERRORS", "------", "None"])
    lines.extend(["", "OUTPUT LOCATION", "----------------", str(output_dir)])
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report


def main() -> int:
    args = parse_args()
    validate_args(args)
    input_dir = args.input.resolve()
    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    files = discover_files(input_dir, output_dir, args.limit)
    if not files:
        raise SystemExit(f"No PNG or WebP files found under {input_dir}")

    settings = Settings(
        scale=args.scale,
        overlay_opacity=args.overlay_opacity,
        second_overlay_opacity=args.second_overlay_opacity,
        sharpness=args.sharpness,
        strong=args.strong,
    )
    engine = build_upscale_engine(args)
    method = engine.label
    processed: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    started = time.perf_counter()

    print(f"Input: {input_dir}")
    print(f"Output: {output_dir}")
    print(f"Files: {len(files)} | Method: {method}")
    for index, source_path in enumerate(files, start=1):
        print(f"[{index}/{len(files)}] {source_path.relative_to(input_dir)}", flush=True)
        try:
            item = process_one(
                source_path,
                input_dir,
                output_dir,
                settings,
                args.overwrite,
                engine,
            )
            processed.append(item)
        except Exception as exc:  # keep the batch moving and document the exact failure
            errors.append({"source": str(source_path.relative_to(input_dir)), "error": repr(exc)})
            print(f"  ERROR: {exc}", file=sys.stderr, flush=True)

    report = write_report(
        output_dir,
        input_dir,
        files,
        processed,
        errors,
        settings,
        method,
        time.perf_counter() - started,
    )
    print(f"Completed: {len(processed)}/{len(files)} source files")
    print(f"Report: {report}")
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
