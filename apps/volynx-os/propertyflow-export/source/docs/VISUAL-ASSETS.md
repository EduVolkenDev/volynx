# Property Flow visual library

The 30 included WebP files in `assets/propertyflow/visuals/` are presentation assets, not listing photos. They do not replace the real images referenced by `content/properties.json`.

- `feature/` contains ten 3D illustrations for actions and states such as search, location, publishing and no results.
- `editorial/` contains twenty architectural and lifestyle images for branded editorial sections.

The published details dialog already uses `feature/04-property-key.webp` in the property story panel and `feature/05-location.webp` in the address/facts panel. These are deliberately decorative (`alt=""`), while the gallery displays the property's actual images from `images/`. They do not purport to show the property's key, building, neighbourhood or floor plan.

Use a relative path such as `./assets/propertyflow/visuals/feature/09-no-results.webp` for additional interface artwork. Keep meaningful photos in `images/` and provide descriptive alt text when an image carries information; use `alt=""` for purely decorative assets. Avoid using a decorative visual as a claim about a listed property.

The library is licensed with this kit; see `LICENSE.md`. The default detail panels use a restrained pair of assets; the rest of the library is available for buyer-specific editorial customization without crowding the actual property photography.
