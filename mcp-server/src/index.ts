import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { z } from "zod";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(currentDir, "../../.env"), quiet: true });

const server = new McpServer({ name: "presentflow", version: "0.1.0" });

server.registerTool(
  "generate_presentation",
  {
    title: "Generate presentation",
    description: "Generate an editable PowerPoint presentation from content and instructions.",
    inputSchema: {
      content: z.string().min(1).describe("Presentation topic or source content"),
      instructions: z.string().optional().describe("Additional visual or editorial direction"),
      nSlides: z.number().int().min(3).max(15).default(6),
      tone: z.enum(["professional", "educational", "casual", "sales"]).default("professional"),
      theme: z.enum(["midnight", "paper"]).default("midnight"),
    },
  },
  async (input) => {
    const webhook = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/generate-presentation";
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.WORKFLOW_API_KEY ? { "X-Workflow-Key": process.env.WORKFLOW_API_KEY } : {}),
      },
      body: JSON.stringify(input),
    });
    const result = await response.json() as Record<string, unknown>;
    if (!response.ok) throw new Error(String(result.message || "Presentation generation failed"));
    return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }], structuredContent: result };
  },
);

await server.connect(new StdioServerTransport());
