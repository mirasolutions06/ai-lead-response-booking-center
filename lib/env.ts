import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return EnvSchema.parse({
    DATABASE_URL: source.DATABASE_URL,
    DIRECT_URL: source.DIRECT_URL,
    OPENAI_API_KEY: source.OPENAI_API_KEY,
  });
}

export const env = loadEnv();
