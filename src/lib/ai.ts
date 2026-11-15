import { neon } from "@neon/ai-sdk-provider";
import { generateText, Output } from "ai";
import type { z } from "zod";

/**
 * Models are served by the Neon AI Gateway. The provider reads
 * NEON_AI_GATEWAY_BASE_URL and NEON_AI_GATEWAY_TOKEN from the environment.
 */
export const MODELS = {
  fast: process.env.AI_MODEL_FAST ?? "claude-haiku-5-5",
  planner: process.env.AI_MODEL_PLANNER ?? "claude-sonnet-5-5",
};

export const aiConfigured = () =>
  !!(process.env.NEON_AI_GATEWAY_BASE_URL && process.env.NEON_AI_GATEWAY_TOKEN);

export async function generateObject<S extends z.ZodType>(opts: {
  model: keyof typeof MODELS;
  schema: S;
  system: string;
  prompt: string;
}): Promise<z.infer<S>> {
  const { output } = await generateText({
    model: neon(MODELS[opts.model]),
    output: Output.object({ schema: opts.schema }),
    system: opts.system,
    prompt: opts.prompt,
  });
  return output as z.infer<S>;
}

export async function generatePlainText(opts: {
  model: keyof typeof MODELS;
  system: string;
  prompt: string;
}): Promise<string> {
  const { text } = await generateText({
    model: neon(MODELS[opts.model]),
    system: opts.system,
    prompt: opts.prompt,
  });
  return text.trim();
}
