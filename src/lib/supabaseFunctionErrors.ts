export async function getSupabaseFunctionErrorMessage(error: unknown) {
  const fallbackMessage =
    error instanceof Error ? error.message : "Edge Function request failed.";

  const context = (error as { context?: unknown })?.context;

  if (context instanceof Response) {
    try {
      const clonedResponse = context.clone();
      const contentType = clonedResponse.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const body = (await clonedResponse.json()) as {
          error?: unknown;
          message?: unknown;
        };
        const message = body.error ?? body.message;

        if (message) return String(message);
      }

      const text = await context.clone().text();

      if (text.trim()) return text.trim();
    } catch {
      return fallbackMessage;
    }
  }

  return fallbackMessage;
}
