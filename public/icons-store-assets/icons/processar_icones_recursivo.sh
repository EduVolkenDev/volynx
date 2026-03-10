#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_SCAN="$(pwd)"
IN="$BASE_DIR/01-originais"
UPS="$BASE_DIR/02-upscaled"
CANVAS_T="$BASE_DIR/03-canvas-transparente"
CANVAS_BG="$BASE_DIR/03-canvas-bg"
WEBP="$BASE_DIR/04-site-webp"
SVG_CAND="$BASE_DIR/05-svg-candidatos"
SVG_FINAL="$BASE_DIR/06-svg-finais"
REJ="$BASE_DIR/99-rejeitados"

CANVAS_SIZE="1024x1024"
INNER_SIZE="760x760"
BG_COLOR="#f3f3f5"
WEBP_QUALITY="92"

echo "[1/7] Verificando dependencias..."
if ! command -v magick >/dev/null 2>&1; then
  echo "ERRO: ImageMagick nao encontrado."
  echo "Instale com: brew install imagemagick"
  exit 1
fi

mkdir -p "$IN" "$UPS" "$CANVAS_T" "$CANVAS_BG" "$WEBP" "$SVG_CAND" "$SVG_FINAL" "$REJ"

echo "[2/7] Procurando imagens recursivamente na pasta atual..."
find "$ROOT_SCAN" \
  -type f \
  \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) \
  ! -path "$BASE_DIR/*" \
  > "$BASE_DIR/lista_imagens.txt"

TOTAL="$(wc -l < "$BASE_DIR/lista_imagens.txt" | tr -d ' ')"

if [ "$TOTAL" -eq 0 ]; then
  echo "Nenhuma imagem encontrada na pasta atual ou subpastas."
  exit 1
fi

echo "Encontradas $TOTAL imagens."

echo "[3/7] Copiando imagens para o fluxo..."
COUNT=1
while IFS= read -r f; do
  ext="${f##*.}"
  printf -v num "%04d" "$COUNT"
  cp "$f" "$IN/icon_$num.$ext"
  COUNT=$((COUNT + 1))
done < "$BASE_DIR/lista_imagens.txt"

echo "[4/7] Fazendo upscale leve e limpeza basica..."
shopt -s nullglob nocaseglob
for f in "$IN"/*.{png,jpg,jpeg,webp}; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  base="${name%.*}"

  magick "$f" \
    -auto-orient \
    -colorspace sRGB \
    -filter Lanczos \
    -resize 1600x1600\> \
    -unsharp 0x0.8+0.8+0.02 \
    "$UPS/$base.png"
done

echo "[5/7] Gerando versao com fundo transparente padronizado..."
for f in "$UPS"/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  base="${name%.*}"

  magick "$f" \
    -trim +repage \
    -resize "$INNER_SIZE>" \
    -gravity center \
    -background none \
    -extent "$CANVAS_SIZE" \
    "$CANVAS_T/$base.png"
done

echo "[6/7] Gerando versao com fundo homogêneo premium..."
for f in "$UPS"/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  base="${name%.*}"

  magick "$f" \
    -trim +repage \
    -resize "$INNER_SIZE>" \
    -gravity center \
    -background "$BG_COLOR" \
    -extent "$CANVAS_SIZE" \
    "$CANVAS_BG/$base.png"
done

echo "[7/7] Exportando WebP e separando candidatos SVG..."
for f in "$CANVAS_T"/*.png; do
  [ -e "$f" ] || continue
  name="$(basename "$f")"
  base="${name%.*}"

  magick "$f" -quality "$WEBP_QUALITY" "$WEBP/$base.webp"
  cp "$f" "$SVG_CAND/"
done

cat <<EOF

Concluido.

Use estas pastas:
- icons/03-canvas-transparente  -> melhor quando a borda ficou boa
- icons/03-canvas-bg            -> melhor quando o transparente ficou feio
- icons/04-site-webp            -> pronto para usar no site
- icons/05-svg-candidatos       -> selecione daqui so os simples para vetorizar

Observacao:
- O script escaneia a pasta atual e todas as subpastas.
- Ele ignora a propria pasta icons para nao entrar em loop.
EOF
