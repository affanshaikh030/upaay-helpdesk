import { google } from "@ai-sdk/google";
import { APICallError } from "ai";

// One model for every AI feature (polish, summary, classification). The key is read from GOOGLE_GENERATIVE_AI_API_KEY by the SDK
export const aiModel = google("gemini-3.5-flash-lite");

export function isAiConfigured() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

// Message and status only: the full error object can carry request details
export function describeAiError(err: unknown) {
  return APICallError.isInstance(err) ? `${err.statusCode} ${err.message}` : err instanceof Error ? err.message : String(err);
}
