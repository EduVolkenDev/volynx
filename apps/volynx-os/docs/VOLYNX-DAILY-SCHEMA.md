# VOLYNX Daily Schema Map

This file is the implementation map for Phase 2. It mirrors the PRD data model while keeping the first implementation storage-agnostic.

## Domain Entities

### `daily_items`

Primary capture record. Every user input is saved here before AI processing starts.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Storage-generated or client-generated id. |
| `user_id` | `DailyId` | Owner id. Local MVP can use a deterministic local user id. |
| `type` | `DailyInputType` | `text`, `link`, `file`, `idea`, `mixed`, or `unknown`. |
| `title` | `string` | Derived from raw content, editable later. |
| `raw_content` | `string` | Original user input. Never discard this. |
| `clean_content` | `string` | Normalized copy used by engines. |
| `intent` | `DailyIntentResult` | Structured intent contract plus AI metadata. |
| `status` | `DailyItemStatus` | Capture and processing lifecycle. |
| `source` | `DailyCaptureSource` | Optional URL/file metadata. |
| `created_at` | `DailyIsoDate` | ISO string. |
| `updated_at` | `DailyIsoDate` | ISO string. |

### `tasks`

Action items created manually, heuristically, or from AI extraction.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Task id. |
| `user_id` | `DailyId` | Owner id. |
| `title` | `string` | Required. |
| `status` | `DailyTaskStatus` | `todo`, `doing`, `done`, `blocked`, or `archived`. |
| `due_date` | `DailyIsoDate | null` | Optional. |
| `source_item_id` | `DailyId` | Links back to original capture. |
| `created_at` | `DailyIsoDate` | ISO string. |
| `updated_at` | `DailyIsoDate` | ISO string. |

### `summaries`

Structured summary output for any text, link, or file.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Summary id. |
| `user_id` | `DailyId` | Owner id. |
| `source_item_id` | `DailyId` | Source capture. |
| `summary_text` | `string` | Short summary. |
| `detailed_text` | `string` | Longer summary. |
| `bullets` | `string[]` | Key bullets. |
| `ai` | `DailyAiMeta` | Engine status and fallback metadata. |
| `created_at` | `DailyIsoDate` | ISO string. |
| `updated_at` | `DailyIsoDate` | ISO string. |

### `writings`

Drafts generated from ideas and then edited/autosaved.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Writing id. |
| `user_id` | `DailyId` | Owner id. |
| `source_item_id` | `DailyId | null` | Optional source capture. |
| `title` | `string` | Draft title. |
| `body` | `string` | Draft body. |
| `version` | `number` | Starts at `1`. |
| `autosaved_at` | `DailyIsoDate | null` | Last autosave timestamp. |
| `ai` | `DailyAiMeta` | Engine status and fallback metadata. |
| `created_at` | `DailyIsoDate` | ISO string. |
| `updated_at` | `DailyIsoDate` | ISO string. |

### `entities`

People, projects, places, URLs, dates, files, companies, or topics extracted from captured content.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Entity id. |
| `user_id` | `DailyId` | Optional during contract parsing, required for storage. |
| `type` | `DailyEntityType` | Entity classification. |
| `name` | `string` | Display name. |
| `normalized_name` | `string` | Search-friendly lowercased name. |
| `source_item_id` | `DailyId` | Optional source capture. |
| `confidence` | `number` | `0..1`. |
| `created_at` | `DailyIsoDate` | Optional before storage. |

### `relations`

Links items, entities, and derived outputs.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Relation id. |
| `user_id` | `DailyId` | Owner id. |
| `type` | `DailyRelationType` | `source_of`, `derived_from`, `mentions`, `related_to`, `duplicates`, `supports`, or `contradicts`. |
| `from_item_id` | `DailyId` | Source item. |
| `to_item_id` | `DailyId` | Optional target item. |
| `to_entity_id` | `DailyId` | Optional target entity. |
| `confidence` | `number` | `0..1`. |
| `reason` | `string` | Human-readable relation reason. |
| `created_at` | `DailyIsoDate` | ISO string. |

### `decisions`

Decision outputs generated from captured context.

| Field | TypeScript | Notes |
| --- | --- | --- |
| `id` | `DailyId` | Decision id. |
| `user_id` | `DailyId` | Owner id. |
| `source_item_id` | `DailyId` | Source capture. |
| `recommendation` | `string` | Final recommendation. |
| `reason` | `string` | Reasoning summary, not hidden chain of thought. |
| `confidence` | `number` | `0..1`. |
| `options` | `DailyDecisionOption[]` | Pros/cons by option. |
| `ai` | `DailyAiMeta` | Engine status and fallback metadata. |
| `created_at` | `DailyIsoDate` | ISO string. |
| `updated_at` | `DailyIsoDate` | ISO string. |

## Structured AI Contracts

All AI outputs must be parsed through `lib/daily/contracts.ts`.

```json
{
  "intent": "task",
  "confidence": 0.82,
  "suggestedActions": [
    {
      "type": "create_task",
      "label": "Create task",
      "confidence": 0.82,
      "reason": "The input contains an explicit action."
    }
  ],
  "entities": []
}
```

```json
{
  "summary": "Short summary.",
  "bullets": ["Key point"],
  "detailed": "Detailed summary."
}
```

```json
{
  "title": "Draft title",
  "body": "Draft body.",
  "version": 1
}
```

```json
{
  "tasks": [
    {
      "title": "Follow up",
      "dueDate": null
    }
  ]
}
```

```json
{
  "recommendation": "Choose the lower-risk option.",
  "reason": "It preserves optionality.",
  "confidence": 0.7,
  "options": []
}
```

## Fallback Policy

- Raw input is saved before AI work starts.
- If AI fails, local fallback helpers in `lib/daily/fallback.ts` return valid contracts.
- Fallback confidence is intentionally modest.
- Fallback output must never delete or overwrite the original input.
- Fallback decisions should mark the item for review rather than pretending high certainty.

