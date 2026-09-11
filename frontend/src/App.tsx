import { FormEvent, useState } from "react";
import { webhookUrl } from "./env";

type Result = { presentationId: string; downloadUrl: string; title?: string };

export function App() {
  const [content, setContent] = useState("");
  const [instructions, setInstructions] = useState("");
  const [slides, setSlides] = useState(6);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!content.trim()) return;
    setStatus("loading");
    setMessage("Planning and rendering your presentation…");
    setResult(null);
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, instructions, nSlides: slides, tone: "professional", theme: "midnight" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Generation failed");
      setResult(data);
      setStatus("success");
      setMessage("Your presentation is ready.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Generation failed");
    }
  }

  return (
    <main>
      <section className="workspace">
        <header>
          <div className="mark">PF</div>
          <div><h1>PresentFlow</h1><p>Turn a brief into an editable PowerPoint.</p></div>
        </header>
        <form onSubmit={submit}>
          <label>Presentation brief
            <textarea required value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Create a sales strategy deck for a B2B SaaS company entering Southeast Asia…" />
          </label>
          <div className="row">
            <label>Slides
              <input type="number" min="3" max="15" value={slides}
                onChange={(e) => setSlides(Number(e.target.value))} />
            </label>
            <label className="grow">Additional direction
              <input value={instructions} onChange={(e) => setInstructions(e.target.value)}
                placeholder="Use concise copy and emphasize market evidence" />
            </label>
          </div>
          <button disabled={status === "loading"}>
            {status === "loading" ? "Generating…" : "Generate presentation"}
          </button>
        </form>
        {status !== "idle" && (
          <div className={`result ${status}`} role="status">
            <span>{message}</span>
            {result?.downloadUrl && <a href={result.downloadUrl}>Download PPTX</a>}
          </div>
        )}
      </section>
      <aside aria-label="Workflow preview">
        <p className="eyebrow">GENERATION PIPELINE</p>
        <h2>One brief.<br />A structured deck.</h2>
        <ol>
          <li><b>01</b><span><strong>Outline</strong> Narrative and slide purpose</span></li>
          <li><b>02</b><span><strong>Structure</strong> Layout-ready slide content</span></li>
          <li><b>03</b><span><strong>Render</strong> Editable PowerPoint output</span></li>
        </ol>
      </aside>
    </main>
  );
}
