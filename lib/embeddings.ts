import { EMBEDDING_MODEL_ID } from "@/lib/openrouter";

const EXPECTED_DIMENSIONS = 768;

type EmbeddingResponse = {
  data?: Array<{ embedding?: unknown }>;
  error?: {
    message?: string;
  };
};

export async function generateEmbedding(text: string): Promise<number[]> {
  const content = text.trim();

  if (!content) {
    throw new Error("Nie można wygenerować embeddingu dla pustego tekstu.");
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Brakuje OPENROUTER_API_KEY w pliku .env.local.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL_ID,
      input: content,
      dimensions: EXPECTED_DIMENSIONS,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as EmbeddingResponse;

  if (!response.ok || result.error) {
    throw new Error(result.error?.message ?? `OpenRouter zwrócił błąd HTTP ${response.status}.`);
  }

  const values = result.data?.[0]?.embedding;

  if (!Array.isArray(values) || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("OpenRouter nie zwrócił poprawnego wektora embeddingu.");
  }

  if (values.length !== EXPECTED_DIMENSIONS) {
    throw new Error(
      `Model ${EMBEDDING_MODEL_ID} zwrócił wektor o długości ${values.length}, a tabela documents wymaga ${EXPECTED_DIMENSIONS} wymiarów.`,
    );
  }

  return values;
}
