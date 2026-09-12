# Architecture and trade-offs

## Objective

PresentFlow turns a natural-language brief into an editable PowerPoint file. It
supports two entry points: a browser interface for people and an MCP tool for AI
clients such as Claude. Both entry points use the same n8n workflow and renderer,
so presentation behavior does not diverge between clients.

The implementation is intentionally smaller than Presenton. The goal is to show
that its core generation model was understood and redesigned as an observable,
end-to-end automation rather than copied line by line.

## What we retained from Presenton

Presenton's most important architectural idea is that presentation generation is
a pipeline of intermediate representations. An LLM does not write the PowerPoint
binary directly. Presenton first creates an outline, maps slides to compatible
layout schemas, generates structured content and assets, and finally exports the
rendered result.

PresentFlow keeps that separation in a reduced form:

```text
Natural-language brief
        │
        ▼
Normalized generation request
        │
        ▼
Structured deck specification
        │
        ▼
Deterministic layout renderer
        │
        ▼
Editable PPTX file
```

This design makes the AI output inspectable and keeps positioning, typography,
file creation, and download behavior in conventional code.

## System architecture

```text
┌──────────────────┐                         ┌──────────────────┐
│ React frontend   │                         │ Claude Desktop   │
│ Human interface  │                         │ MCP client       │
└────────┬─────────┘                         └────────┬─────────┘
         │ HTTPS                                      │ stdio
         │                                            ▼
         │                                  ┌──────────────────┐
         │                                  │ PresentFlow MCP  │
         │                                  │ input validation │
         │                                  └────────┬─────────┘
         │                                           │ HTTPS
         └──────────────────────┬────────────────────┘
                                ▼
                     ┌──────────────────────┐
                     │ n8n Cloud workflow   │
                     │ validation           │
                     │ prompt construction  │
                     │ LLM orchestration    │
                     │ response parsing     │
                     └──────────┬───────────┘
                                │ structured deck JSON
                                ▼
                     ┌──────────────────────┐
                     │ Renderer API         │
                     │ Zod validation       │
                     │ PptxGenJS layouts    │
                     │ file generation      │
                     └──────────┬───────────┘
                                │
                                ▼
                     Downloadable PPTX URL
```

During local development, ngrok can expose the renderer to n8n Cloud. The demo
renderer can also run as a Render.com Web Service with a stable HTTPS origin.
Neither option contains presentation logic; they only host the renderer API.

## Component responsibilities

| Component | Responsibility | Deliberately excluded |
| --- | --- | --- |
| React frontend | Collect the brief, instructions and slide count; show loading, errors and the download link | LLM credentials and slide rendering |
| n8n workflow | Validate inputs, create the LLM prompt, parse the response and call the renderer | PowerPoint drawing logic |
| Renderer API | Validate the deck schema, apply layouts and themes, write the PPTX, and serve the generated file | Prompt engineering and model-provider logic |
| MCP server | Register `generate_presentation`, validate tool arguments, call n8n, and return structured results | A second presentation pipeline |

These boundaries allow each part to change independently. A different frontend
or AI client can reuse the webhook. A different model can replace OpenAI inside
n8n. The renderer can add layouts without changing the MCP protocol.

## End-to-end request flow

### Frontend flow

1. The user submits `content`, `instructions`, `nSlides`, `tone`, and `theme`.
2. The frontend sends JSON to the active n8n production webhook.
3. n8n checks required fields and constrains the slide count to the supported
   range.
4. The OpenAI node generates exactly one deck specification containing a title,
   theme, and ordered slides.
5. A Code node extracts the JSON object even if the model surrounds it with a
   Markdown code fence.
6. n8n posts the structured deck to the renderer's `/render` endpoint.
7. The renderer validates the payload with Zod, assigns a UUID, creates every
   slide with PptxGenJS, and writes the PPTX to its output directory.
8. The renderer returns `presentationId`, `title`, and `downloadUrl`. n8n passes
   that response back to the frontend.

### MCP flow

1. Claude Desktop starts the local MCP server over `stdio` using an absolute Node
   and server path.
2. Claude discovers the `generate_presentation` tool and submits validated tool
   arguments.
3. The MCP server calls the same n8n production webhook used by the frontend.
4. The remaining generation path is identical to the frontend flow.
5. Claude receives the presentation ID, title, and download URL as both text and
   structured MCP output.

The MCP layer is intentionally thin. Duplicating generation logic there would
create two implementations to test and maintain.

## Data contract

The LLM produces a constrained deck specification rather than arbitrary drawing
instructions. A simplified payload looks like this:

```json
{
  "title": "AI Automation for Marketing Teams",
  "theme": "midnight",
  "slides": [
    {
      "type": "title",
      "title": "AI Automation for Marketing Teams",
      "subtitle": "Practical opportunities"
    },
    {
      "type": "content",
      "title": "High-impact workflows",
      "bullets": ["Automate campaign reporting", "Summarize customer research"]
    }
  ]
}
```

The renderer accepts only the supported themes and slide types. This contract
limits model freedom at the boundary where unreliable output would otherwise
become malformed presentation code.

## Presentation model

The prototype supports two themes, `midnight` and `paper`, and four layout types:

- `title`
- `content`
- `two-column`
- `closing`

All text remains editable in PowerPoint. The renderer owns slide dimensions,
type hierarchy, spacing, colors, numbering, and bullet placement. The model
chooses content and layout type but does not choose arbitrary coordinates.

## Reliability and failure handling

Validation occurs at more than one boundary:

- n8n rejects an empty brief and normalizes the slide count and theme.
- The prompt requests a fixed JSON vocabulary and exact slide count.
- The parser extracts the JSON object from common fenced-model output.
- Zod rejects unsupported themes, layouts, missing titles, excessive slide
  counts, and malformed content before file generation.
- Express returns a JSON error response rather than an incomplete download URL.
- n8n records each execution, making the failed node and provider response
  visible during debugging.

The current webhook is synchronous because the assessment deck is small. A
request remains open while the LLM and renderer finish. This keeps the frontend
and MCP contract simple, but it is not appropriate for long-running production
jobs.

## Security considerations

- OpenAI credentials live in n8n's credential store, not in the frontend or
  exported workflow source.
- Real `.env` files, local Claude configuration, compiled output, generated
  presentations, logs, and dependencies are excluded from Git.
- The browser receives only the public n8n webhook URL.
- The MCP server loads configuration locally and does not expose credentials in
  tool output.
- n8n restricts browser access to the configured frontend origin.

The prototype webhook and renderer endpoint do not yet enforce strong client
authentication. Their public exposure is limited to demonstration use. A
production service would authenticate both hops, rate-limit generation, cap
request sizes, scan uploaded assets, and issue short-lived download URLs.

## Trade-offs

| Decision | Benefit | Cost | Production direction |
| --- | --- | --- | --- |
| n8n Cloud for orchestration | The workflow is visible, editable, and easy to demonstrate | Workflow behavior depends on a hosted service and its execution limits | Export/version workflows and add environment-specific configuration |
| Dedicated Node renderer | PowerPoint output is deterministic, testable, and independent of the LLM | Every new visual pattern requires renderer code | Grow a versioned layout library with visual regression tests |
| PptxGenJS instead of browser export | Low memory use, fast startup, and editable native text | Less CSS freedom than Presenton's HTML renderer | Keep native PPTX for editability; add HTML rendering only for designs that need it |
| Four layouts and two themes | Predictable output within a one-day assessment | Less design variety than Presenton | Add charts, images and reusable template packs incrementally |
| Synchronous webhook | Small API surface and straightforward frontend/MCP clients | Long generations can hit request timeouts | Queue jobs and expose `create` plus `get_status` operations |
| ngrok locally or Render.com for the demo | Supports fast local iteration and a stable hosted demo URL using the same container | ngrok is temporary; Render free services sleep and use an ephemeral filesystem | Use paid compute plus object storage behind a stable HTTPS domain |
| Local filesystem output | Minimal infrastructure for the prototype | Files disappear when the process or host is removed and cleanup is manual | Store PPTX files in S3/R2 and return signed, expiring URLs |
| Local stdio MCP server | Simple Claude Desktop integration with no public MCP endpoint | Requires local installation and configuration | Offer Streamable HTTP MCP with OAuth for remote clients |
| One shared n8n workflow | Frontend and Claude always use the same business logic | A workflow failure affects both entry points | Add queue isolation, retries, monitoring and idempotency keys |

## Scope decisions

The implementation does not attempt to reproduce Presenton's complete product.
The following capabilities were excluded intentionally:

- Drag-and-drop slide editing
- Smart HTML slide generation
- Custom PPTX-to-template conversion
- Stock or generated images
- Charts and citations
- Multiple LLM and image providers
- User accounts and workspace administration
- PDF export
- Durable cloud storage

These features are valuable, but they are not required to demonstrate the core
workflow. Adding them within the assessment window would increase surface area
without improving the proof that both frontend and MCP clients can generate and
download an editable presentation through the same automation.

## Production evolution

A production version would preserve the component boundaries while changing the
runtime model:

1. The webhook authenticates the caller and creates a durable job.
2. A queue worker performs outline and slide generation with bounded retries.
3. The renderer validates text fit, assets, charts, and accessibility metadata.
4. Generated files are uploaded to object storage.
5. The job stores status, diagnostics, and a signed download URL.
6. Frontend and MCP clients poll or subscribe to completion events.
7. Metrics track latency, provider failures, token use, rendering failures, and
   download success.

This keeps the current API concept while removing the prototype's timeout,
storage, tunnel, and authentication limitations.

## Summary

PresentFlow demonstrates the full product path with one shared workflow:

```text
Brief -> structured deck -> validated layout data -> editable PPTX -> download
```

The design borrows Presenton's strongest separation of concerns while choosing a
smaller layout vocabulary and deterministic renderer that can be built, tested,
and demonstrated within the assessment timeline. The trade-offs are explicit:
the prototype favors clarity and end-to-end reliability, while the production
path adds durable jobs, storage, authentication, and broader presentation
capabilities without replacing the core architecture.
