// Minimal Gemini REST client (models.generateContent with a JSON response schema).
// The key stays on the server: it is only sent in the x-goog-api-key header and never
// logged or copied into an error message.
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const TIMEOUT_MS = 20000;

export class GeminiError extends Error {}

export const getGeminiModel = () => process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;

export const generateGeminiJson = async (prompt, responseSchema) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new GeminiError("AI recommendations aren't set up on this server yet (no Gemini API key configured).");
  }

  let res;
  try {
    res = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(getGeminiModel())}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new GeminiError(
      error?.name === "TimeoutError"
        ? "The AI service took too long to respond. Please try again."
        : "Couldn't reach the AI service. Check the server's internet connection and try again."
    );
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const reason = JSON.stringify(body?.error?.details || []);
    console.error(`Gemini request failed: HTTP ${res.status} ${body?.error?.status || ""}`);
    if (res.status === 429) {
      throw new GeminiError("The AI service's free-tier limit has been reached. Please wait a minute and try again.");
    }
    if (res.status === 401 || res.status === 403 || reason.includes("API_KEY_INVALID")) {
      throw new GeminiError("The server's Gemini API key was rejected. Ask the admin to check GEMINI_API_KEY.");
    }
    if (res.status === 404) {
      throw new GeminiError("The configured Gemini model isn't available. Ask the admin to check GEMINI_MODEL.");
    }
    throw new GeminiError("The AI service couldn't handle this request right now. Please try again later.");
  }

  const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("The AI service returned an unreadable answer. Please try again.");
  }
};
