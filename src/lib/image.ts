import "server-only";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Slide background art via Google's Gemini image model (gemini-3.1-flash-image).
 * Returns a base64 data URL, or null if image generation isn't configured /
 * the model returned no image. Text generation stays on Nebius; only imagery
 * runs here, so the two providers are fully independent.
 */

const IMAGE_MODEL = process.env.IMAGE_MODEL?.trim() || "gemini-3.1-flash-image";

export function imageEnabled(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export type Aspect = "16:9" | "3:4";

export async function generateSlideImage(
  prompt: string,
  aspectRatio: Aspect = "16:9",
): Promise<string | null> {
  if (!imageEnabled()) return null;

  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });

  const result = await generateText({
    model: google(IMAGE_MODEL),
    prompt,
    providerOptions: {
      google: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio },
      },
    },
  });

  for (const file of result.files ?? []) {
    if (file.mediaType?.startsWith("image/")) {
      return `data:${file.mediaType};base64,${file.base64}`;
    }
  }
  return null;
}
