# Architecture and trade-offs

## Pipeline

Both entry points use the same orchestration path:

```text
React frontend ─┐
                ├─> n8n webhook -> LLM -> structured deck -> renderer -> PPTX
MCP server ─────┘
```

n8n owns request validation and AI orchestration. The renderer owns deterministic
layout and PowerPoint generation. This follows Presenton's separation between
content planning, layout-compatible structured content, assets, and export.

## Initial scope

The first version intentionally supports two themes and four layout types. It
does not reproduce Presenton's editor, custom templates, image providers,
multi-user authentication, or Smart HTML engine. A smaller layout vocabulary
makes the output predictable and lets the assessment demonstrate a complete
workflow rather than a broad but fragile clone.

## Production improvements

- Replace the blocking webhook with a queued job and status endpoint.
- Store generated files in object storage with signed, expiring URLs.
- Validate a strict LLM JSON schema and retry malformed generations.
- Add image sourcing, charts, citations, and text-overflow checks.
- Protect the webhook with authenticated requests and rate limits.
- Pin all container images and package versions before deployment.

