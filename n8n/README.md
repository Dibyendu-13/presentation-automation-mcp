# n8n setup

Import `presentation-workflow.json`, open the **Generate structured deck** node,
and attach an OpenAI credential. Set these n8n environment variables:

- `RENDERER_URL`: internal renderer URL, such as `http://renderer:3001`
- `WORKFLOW_API_KEY`: optional shared webhook secret

The workflow accepts `content`, `instructions`, `nSlides`, `tone`, and `theme`.
It returns `presentationId`, `title`, and `downloadUrl`.

