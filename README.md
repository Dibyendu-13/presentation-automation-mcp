# PresentFlow

PresentFlow is an assessment-sized presentation automation system inspired by
Presenton's staged generation pipeline. A React frontend and an MCP server call
the same n8n workflow. n8n creates a structured deck specification and sends it
to a dedicated renderer that produces an editable PowerPoint file.

## Repository structure

```text
frontend/    Browser interface
renderer/    PPTX rendering and download service
mcp-server/  MCP tool server for ChatGPT and Claude
n8n/         Importable n8n workflow
docs/        Architecture, trade-offs, and demo notes
```

## Quick start

1. Copy `.env.example` to `.env`. Also copy `frontend/.env.example` to
   `frontend/.env.local` and set the active n8n webhook URL.
2. Run `docker compose up --build`.
3. Open `http://localhost:5678`, import `n8n/presentation-workflow.json`, add an
   OpenAI credential to the marked node, and activate the workflow.
4. Open `http://localhost:3000` and generate a presentation.

See `docs/architecture.md` for the intended production design and
`docs/demo-script.md` for the Loom walkthrough.
