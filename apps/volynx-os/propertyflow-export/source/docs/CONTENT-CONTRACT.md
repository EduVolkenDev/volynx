# Property Flow static content contract

The export has no database and sends no catalogue data to VOLYNX. All content lives in two local JSON files.

## `content/site.json`

- `schemaVersion`: keep as `1`.
- `defaultLanguage`: `pt-BR` or `en`.
- `languages`: languages shown by the toggle.
- `brand`: company name, tagline, mark or local logo path, colors and attribution preference.
- `hero`: localized eyebrow, title and description.
- `contact`: WhatsApp digits including country code, email, phone, address and default message.
- `template.selected`: default licensed template.
- `template.available`: generated from the purchased tier. Do not add templates from another tier.
- `template.showSelector`: keep `true` while choosing a layout; set to `false` before publishing if visitors should not see the selector.

Localized fields accept this shape:

```json
{ "pt-BR": "Texto em português", "en": "English text" }
```

## `content/properties.json`

Each property supports:

```json
{
  "id": "unique-id",
  "slug": "url-friendly-name",
  "category": "Casa",
  "listingType": "sale",
  "featured": false,
  "title": { "pt-BR": "Título", "en": "Title" },
  "summary": { "pt-BR": "Resumo", "en": "Summary" },
  "description": { "pt-BR": "Descrição", "en": "Description" },
  "priceLabel": "R$ 1.000.000",
  "priceAmount": 1000000,
  "location": { "label": "Cidade, UF", "city": "Cidade", "region": "UF", "neighborhood": "Bairro" },
  "facts": { "bedrooms": 3, "bathrooms": 2, "area": "140 m²", "parking": 2 },
  "images": [{ "src": "./images/example.webp", "alt": "Accessible image description" }]
}
```

Allowed `listingType` values are `sale` and `rent`.

## Photos

Place photos in `images/` and reference them with `./images/file.webp`. Prefer WebP or AVIF, resize the longest side to roughly 1920 pixels and aim for 150–350 KB per image. Never place client credentials, spreadsheets or private documents in the export.

Run `npm run validate` after every content change.
