import { describe, expect, it } from "vitest"
import { classifyDailyIntent } from "@/lib/daily/intent-engine"
import { routeDailyItem } from "@/lib/daily/routing-engine"
import { createDailyTaskRecords } from "@/lib/daily/task-engine"
import { createDailyId } from "@/lib/daily/storage"
import { cleanDailyContent, createDailyTitle, detectDailyInputType } from "@/lib/daily/fallback"
import { dailyValidationCases, dailyValidationReferenceDate } from "@/lib/daily/validation-cases"

describe("Daily validation matrix", () => {
  for (const validationCase of dailyValidationCases) {
    it(`${validationCase.id}: ${validationCase.description}`, async () => {
      const intent = await classifyDailyIntent({
        rawContent: validationCase.rawContent,
        source: validationCase.source
      })

      expect(intent.intent).toBe(validationCase.expectedIntent)

      const item = {
        id: createDailyId("case"),
        userId: "test-user",
        type: detectDailyInputType(validationCase.rawContent, validationCase.source),
        title: createDailyTitle(validationCase.rawContent, validationCase.id),
        rawContent: validationCase.rawContent,
        cleanContent: cleanDailyContent(validationCase.rawContent),
        intent,
        status: "ready" as const,
        source: validationCase.source,
        createdAt: dailyValidationReferenceDate.toISOString(),
        updatedAt: dailyValidationReferenceDate.toISOString()
      }

      const route = routeDailyItem(item)
      expect(route.kind).toBe(validationCase.expectedRoute)

      if (!validationCase.expectedTasks?.length) {
        return
      }

      const tasks = await createDailyTaskRecords({
        sourceItemId: item.id,
        rawContent: validationCase.rawContent,
        referenceDate: dailyValidationReferenceDate
      })

      expect(tasks).toHaveLength(validationCase.expectedTasks.length)

      for (const expectedTask of validationCase.expectedTasks) {
        expect(
          tasks.some((task) =>
            task.title.includes(expectedTask.titleIncludes) &&
            task.dueDate === expectedTask.dueDate
          )
        ).toBe(true)
      }
    })
  }
})
