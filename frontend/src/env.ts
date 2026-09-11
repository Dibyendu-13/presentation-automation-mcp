function requiredUrl(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Copy frontend/.env.example to frontend/.env.local and restart Vite.`,
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL.`);
  }

  if (!parsed.pathname.includes("/webhook/")) {
    console.warn(`[frontend] ${name} does not look like an active n8n production webhook.`, value);
  }

  return parsed.toString();
}

export const webhookUrl = requiredUrl("VITE_N8N_WEBHOOK_URL");

