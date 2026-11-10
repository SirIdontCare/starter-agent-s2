import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateImage, generateText } from "ai";

// Jedno miejsce, w którym aplikacja łączy się z modelami.
// Klucz i nazwy modeli pochodzą z pliku .env.local (lokalnie) albo z ustawień Vercel (online).

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

/** Model do rozmowy — przełącznik „Standard” w czacie. */
export const MODEL_ID = process.env.OPENROUTER_MODEL || "openai/gpt-6-luna";
/** Mocniejszy model — przełącznik „Pro”. Bez tej zmiennej działa jak Standard. */
export const PRO_MODEL_ID = process.env.OPENROUTER_MODEL_PRO || MODEL_ID;
/** Model generujący obrazy (strona Grafiki i narzędzie generateImage). */
export const IMAGE_MODEL_ID =
  process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-lite-image";
/** Model embeddingów bazy wiedzy. Musi zwracać wektor o 768 wymiarach (patrz supabase/schema.sql). */
export const EMBEDDING_MODEL_ID =
  process.env.OPENROUTER_EMBEDDING_MODEL || "google/gemini-embedding-2";

const IMAGE_TIMEOUT_MS = 30_000;
const WEB_SEARCH_MAX_RESULTS = 3;

export type ChatModelTier = "flash" | "pro";

export function chatModel(tier: ChatModelTier = "flash") {
  return openrouter.chat(tier === "pro" ? PRO_MODEL_ID : MODEL_ID);
}

export function isLimitError(message: string) {
  return /\b(402|429)\b|quota|credits|rate.?limit|insufficient/i.test(message);
}

export const LIMIT_ERROR_MESSAGE =
  "Limit albo środki na kluczu OpenRouter zostały wyczerpane. Spróbuj ponownie za moment albo sprawdź limit swojego klucza.";

function readableError(error: unknown) {
  const message = error instanceof Error ? error.message : "Nieznany błąd API.";
  return isLimitError(message) ? LIMIT_ERROR_MESSAGE : message;
}

/**
 * Wyszukiwanie w internecie: model dostaje wyniki z wtyczki „web” OpenRoutera
 * i streszcza je. Każde wyszukanie jest dodatkowo płatne (poza tokenami).
 */
export async function searchWeb(query: string) {
  const result = await generateText({
    model: openrouter.chat(MODEL_ID, {
      plugins: [{ id: "web", max_results: WEB_SEARCH_MAX_RESULTS }],
    }),
    prompt: `Wyszukaj w internecie i streść najważniejsze wyniki dla zapytania: ${query}. Podaj najważniejsze fakty i linki, jeśli są dostępne.`,
  });

  return result.text;
}

export type ImageResult =
  | { image: string }
  | { error: string; timedOut?: boolean };

/** Generuje obraz i zwraca go jako data URL gotowy do wstawienia w <img src>. */
export async function createImage(prompt: string): Promise<ImageResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return { error: "Brakuje OPENROUTER_API_KEY w konfiguracji aplikacji." };
  }

  try {
    const { image } = await generateImage({
      model: openrouter.imageModel(IMAGE_MODEL_ID),
      prompt,
      abortSignal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });

    return { image: `data:${image.mediaType};base64,${image.base64}` };
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return { error: "Przekroczono limit 30 sekund generowania obrazu.", timedOut: true };
    }

    return { error: readableError(error) };
  }
}
