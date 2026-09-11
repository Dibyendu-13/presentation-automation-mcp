import { z } from "zod";

export const deckSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  theme: z.enum(["midnight", "paper"]).default("midnight"),
  slides: z.array(z.object({
    type: z.enum(["title", "content", "two-column", "closing"]),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    bullets: z.array(z.string()).max(6).default([]),
    left: z.array(z.string()).max(5).optional(),
    right: z.array(z.string()).max(5).optional(),
  })).min(1).max(20),
});

export type DeckSpec = z.infer<typeof deckSchema>;

