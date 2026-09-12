# PresentFlow

PresentFlow is an end-to-end AI presentation generator built for the ContentBeta
developer assessment. A user submits a brief through a React frontend or Claude
Desktop, n8n converts it into a structured deck, and a Node.js renderer creates
an editable PowerPoint file.

The project takes inspiration from Presenton's staged pipeline: generate content
first, map it into a constrained presentation structure, and keep file rendering
deterministic.

## Demo

[Watch the end-to-end Loom walkthrough](https://www.loom.com/share/2d2b0b324e0941999508649a246c5481).

## Demo architecture

```text
React frontend ─┐
                ├──> n8n Cloud ──> OpenAI ──> Renderer API ──> PPTX download
Claude + MCP ───┘
```

Both entry points call the same n8n webhook. The MCP server does not duplicate
the presentation workflow.

## Repository structure

```text
frontend/     React and Vite user interface
renderer/     Express, Zod, and PptxGenJS rendering service
mcp-server/   Local stdio MCP server for Claude Desktop
n8n/          Importable n8n workflow
docs/         Architecture and trade-off documentation
```

## Current scope

- Prompt and instruction input
- Configurable slide count from 3 to 15
- Professional structured content generated through OpenAI in n8n
- `title`, `content`, `two-column`, and `closing` layouts
- `midnight` and `paper` themes
- Editable PPTX export
- Browser download flow
- Claude Desktop MCP tool

The prototype does not include PDF export, generated images, charts, a visual
slide editor, user accounts, or permanent object storage.

## Prerequisites

- Node.js 20 or newer
- npm
- An n8n Cloud workspace or local n8n instance
- An OpenAI API key configured as an n8n credential
- Claude Desktop for the MCP demonstration
- ngrok when n8n Cloud needs to reach a renderer running on your Mac

## Installation

```bash
git clone https://github.com/Dibyendu-13/presentation-automation-mcp.git
cd presentation-automation-mcp
npm install
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

Real `.env` files are ignored by Git. Do not commit API keys or local Claude
configuration.

## 1. Start the renderer

```bash
npm run dev:renderer
```

Verify it:

```bash
curl http://localhost:3001/health
```

Expected response:

```json
{"status":"ok"}
```

Generated files are written to `renderer/output/`, which is excluded from Git.

## 2. Expose the renderer to n8n Cloud

n8n Cloud cannot call `localhost:3001`. Start a development tunnel in another
terminal:

```bash
ngrok http 3001
```

Copy the HTTPS forwarding URL and configure the root `.env`:

```env
RENDERER_PORT=3001
PUBLIC_RENDERER_URL=https://YOUR-NGROK-URL
N8N_WEBHOOK_URL=https://YOUR-N8N-SUBDOMAIN.app.n8n.cloud/webhook/generate-presentation
```

Restart the renderer after changing `.env`, then verify the public endpoint:

```bash
curl https://YOUR-NGROK-URL/health
```

The free ngrok URL remains available only while that tunnel session is running.

### Stable demo URL with Render.com

The repository includes `render.yaml` and a production Dockerfile. To deploy the
renderer as a Render Web Service:

1. Open the Render Dashboard and select **New → Blueprint**.
2. Connect this GitHub repository.
3. Render reads `render.yaml` and creates `presentflow-renderer`.
4. Wait for `/health` to pass, then copy the generated `onrender.com` URL.
5. Set the n8n variable `RENDERER_URL` to that origin and republish the workflow.

The renderer automatically uses Render's assigned `PORT` and
`RENDER_EXTERNAL_URL`; no manual renderer environment variable is required.

Render's free filesystem is ephemeral. Generated PPTX files remain downloadable
until the service sleeps, restarts, or redeploys. Production file delivery should
use object storage such as S3 or Cloudflare R2.

## 3. Import and configure the n8n workflow

1. Import `n8n/presentation-workflow.json` into n8n.
2. Create an n8n variable named `RENDERER_URL` with the ngrok origin only, such
   as `https://example.ngrok-free.app`.
3. Open **Generate structured deck** and select your own OpenAI credential.
4. Save and publish the workflow.
5. In the webhook node, allow the frontend origin for CORS. For local Vite this
   is normally `http://localhost:5173`.

The repository export deliberately contains no credential ID and no personal
renderer URL. n8n resolves the renderer through `$vars.RENDERER_URL`.

### Test the n8n webhook

For test mode, click **Listen for test event** and use the displayed
`/webhook-test/` URL. For an active workflow, use `/webhook/`:

```bash
curl -X POST "https://YOUR-N8N-SUBDOMAIN.app.n8n.cloud/webhook/generate-presentation" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "AI automation opportunities for marketing teams",
    "instructions": "Use concise language and practical examples",
    "nSlides": 6,
    "tone": "professional",
    "theme": "midnight"
  }'
```

A successful response contains:

```json
{
  "presentationId": "generated-uuid",
  "title": "AI Automation for Marketing Teams",
  "downloadUrl": "https://YOUR-RENDERER/files/generated-uuid.pptx"
}
```

## 4. Start the frontend

Set `frontend/.env.local`:

```env
VITE_N8N_WEBHOOK_URL=https://YOUR-N8N-SUBDOMAIN.app.n8n.cloud/webhook/generate-presentation
```

Start Vite:

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173), enter a presentation brief,
and select **Generate presentation**.

## 5. Build and configure the MCP server

```bash
npm run build --workspace mcp-server
which node
```

Confirm that `mcp-server/dist/index.js` exists. Add PresentFlow to Claude
Desktop's `~/Library/Application Support/Claude/claude_desktop_config.json`
while preserving any existing top-level settings:

```json
{
  "mcpServers": {
    "presentflow": {
      "command": "/absolute/path/to/node",
      "args": [
        "/absolute/path/to/presentation-automation-mcp/mcp-server/dist/index.js"
      ]
    }
  }
}
```

The MCP server loads `N8N_WEBHOOK_URL` from the repository's root `.env`. Fully
quit and reopen Claude Desktop after changing its configuration.

Ask Claude:

```text
Use the PresentFlow generate_presentation tool to create a six-slide
professional presentation about AI automation for marketing teams.
```

A successful MCP execution creates a new n8n run and returns the same structured
download result as the frontend.

## Docker option

The repository includes `docker-compose.yml` for running n8n, the renderer, and
the frontend locally:

```bash
docker compose up --build
```

The local Docker path uses `http://renderer:3001` between containers. The n8n
Cloud path uses the public renderer URL described above.

## Useful commands

```bash
npm run dev:frontend
npm run dev:renderer
npm run build --workspace mcp-server
npm run build
npm run typecheck
docker compose config --quiet
```

## Troubleshooting

### The frontend calls `localhost:5678`

Set `VITE_N8N_WEBHOOK_URL` in `frontend/.env.local` and restart Vite.

### n8n returns 500

Open n8n **Executions** and inspect the failed node. Confirm the workflow is
published, the OpenAI credential is selected, the renderer URL is current, and
both the renderer and tunnel are running.

### Claude reports `fetch failed`

Ensure the root `.env` uses the public n8n webhook. `http://n8n:5678` works only
inside Docker and cannot be resolved by Claude Desktop running on macOS.

### The download opens an ngrok warning

This is expected on ngrok's free plan. Open the tunnel once in the browser or
download with the `ngrok-skip-browser-warning` header.

## Security

- `.env`, `.env.local`, generated files, compiled output, logs, and dependencies
  are ignored by Git.
- The exported workflow contains no API secret or credential identifier.
- OpenAI credentials remain in n8n's encrypted credential store.
- The prototype endpoints should not be treated as production-secure public
  APIs. Production deployment should add authentication, rate limits, request
  quotas, and expiring download links.

## Architecture and trade-offs

See [docs/architecture.md](docs/architecture.md) for the detailed component
boundaries, request sequence, data contract, security model, trade-off matrix,
and production evolution plan.

## Prototype trade-off

For local development, the renderer can run on a Mac and use ngrok. For the
submitted demo, the same renderer can run as a Render Web Service with a stable
HTTPS origin. Render's free local filesystem remains temporary, so a production
implementation would queue long-running jobs and store presentations in object
storage using signed, expiring URLs.
