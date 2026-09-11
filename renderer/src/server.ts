import cors from "cors";
import express from "express";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { deckSchema } from "./types.js";
import { renderDeck } from "./render.js";

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(currentDir, "../../.env");
const envResult = config({ path: rootEnvPath });
const port = Number(process.env.RENDERER_PORT || 3001);
const publicUrl = (
  process.env.PUBLIC_RENDERER_URL || `http://localhost:${port}`
).replace(/\/$/, "");
const outputDir = path.resolve(currentDir, "../output");
await mkdir(outputDir, { recursive: true });
console.log("[renderer] Configuration loaded", {
  envFile: envResult.error ? "not found; using process environment and defaults" : rootEnvPath,
  port,
  publicUrl,
});
console.log("[renderer] Output directory ready", { outputDir });

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use((req, _res, next) => {
  console.log("[renderer] Incoming request", {
    method: req.method,
    path: req.path,
  });
  next();
});
app.use("/files", express.static(outputDir));
app.get("/health", (_req, res) => {
  console.log("[renderer] Health check passed");
  res.json({ status: "ok" });
});

app.post("/render", async (req, res, next) => {
  const startedAt = Date.now();
  console.log("[renderer] Render request received", {
    title: req.body?.title,
    theme: req.body?.theme,
    slideCount: Array.isArray(req.body?.slides) ? req.body.slides.length : undefined,
  });
  try {
    const deck = deckSchema.parse(req.body);
    console.log("[renderer] Request validation passed", {
      title: deck.title,
      slideCount: deck.slides.length,
    });
    const id = randomUUID();
    const filename = `${id}.pptx`;
    const outputPath = path.join(outputDir, filename);
    console.log("[renderer] Presentation identifiers created", { id, filename });
    await renderDeck(deck, outputPath);
    const downloadUrl = `${publicUrl}/files/${filename}`;
    console.log("[renderer] Render completed", {
      id,
      outputPath,
      downloadUrl,
      durationMs: Date.now() - startedAt,
    });
    res.status(201).json({ presentationId: id, title: deck.title, downloadUrl });
  } catch (error) { next(error); }
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[renderer] Request failed", error);
  res.status(400).json({ message: error instanceof Error ? error.message : "Unable to render presentation" });
});

app.listen(port, () => {
  console.log("[renderer] Server ready", {
    port,
    healthUrl: `http://localhost:${port}/health`,
    renderUrl: `http://localhost:${port}/render`,
    publicUrl,
    outputDir,
  });
});
