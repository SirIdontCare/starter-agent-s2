import { NextResponse } from "next/server";
import { createImage } from "@/lib/openrouter";

export const maxDuration = 30;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { prompt?: unknown } | null;
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Podaj opis obrazu do wygenerowania." },
      { status: 400 },
    );
  }

  const result = await createImage(prompt);

  if ("error" in result) {
    if (result.timedOut) {
      return NextResponse.json(
        { error: "Generowanie trwało dłużej niż 30 sekund. Spróbuj krótszego opisu." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: `Nie udało się wygenerować obrazu: ${result.error}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    image: result.image,
    text: "Gotowe. Obraz został wygenerowany na podstawie Twojego opisu.",
  });
}
