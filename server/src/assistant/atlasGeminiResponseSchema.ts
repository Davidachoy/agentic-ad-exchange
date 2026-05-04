import { SchemaType, type ResponseSchema } from "@google/generative-ai";

function enumString(values: string[]): ResponseSchema {
  return {
    type: SchemaType.STRING,
    format: "enum",
    enum: values,
  };
}

/**
 * Gemini `responseSchema` for Atlas chat: flat block objects with `type` +
 * optional fields per variant. Zod (`parseAssistantChatResponse`) is the
 * source of truth for which fields belong to which `type`.
 */
export const atlasAssistantResponseGeminiSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    blocks: {
      type: SchemaType.ARRAY,
      maxItems: 5,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: enumString(["metrics_strip", "pill_group", "decision", "bar_chart"]),
          items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                value: { type: SchemaType.STRING },
                dataSource: enumString(["exchange", "simulated"]),
              },
              required: ["label", "value", "dataSource"],
            },
          },
          sectionTitle: { type: SchemaType.STRING },
          pills: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                text: { type: SchemaType.STRING },
                variant: enumString(["new", "kept", "neutral"]),
              },
              required: ["text", "variant"],
            },
          },
          headline: { type: SchemaType.STRING },
          summary: { type: SchemaType.STRING },
          reasoning: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          rejected: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                action: { type: SchemaType.STRING },
                reason: { type: SchemaType.STRING },
              },
              required: ["action", "reason"],
            },
          },
          complianceNote: { type: SchemaType.STRING },
          badge: { type: SchemaType.STRING },
          title: { type: SchemaType.STRING },
          subtitle: { type: SchemaType.STRING },
          yCaption: { type: SchemaType.STRING },
          dataSource: enumString(["exchange", "simulated"]),
          points: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                label: { type: SchemaType.STRING },
                value: { type: SchemaType.NUMBER },
              },
              required: ["label", "value"],
            },
          },
        },
        required: ["type"],
      },
    },
  },
  required: ["reply"],
};
