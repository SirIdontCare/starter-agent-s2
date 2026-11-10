import { chatModel, type ChatModelTier } from "@/lib/openrouter";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 30;


type ChatModel = ChatModelTier;

const thinkingPrompt = `Jesteś analitykiem. Twoim zadaniem jest MYŚLEĆ NA GŁOS.

Gdy dostajesz pytanie, MUSISZ przejść przez te kroki:

### 🧠 MYŚLĘ...

**Krok 1 — Zrozumienie:**
Co dokładnie użytkownik pyta? Przeformułuj pytanie swoimi słowami.

**Krok 2 — Fakty:**
Co wiem na ten temat? Co jest pewne, a co wymaga sprawdzenia?

**Krok 3 — Analiza:**
Jakie są 2-3 możliwe podejścia/odpowiedzi?

**Krok 4 — Ocena:**
Które podejście jest najlepsze? DLACZEGO?

### ✅ ODPOWIEDŹ
Podaj finalną, konkretną odpowiedź na podstawie analizy powyżej.

WAŻNE:
- ZAWSZE pokaż CAŁY proces myślenia — użytkownik widzi jak pracujesz
- Używaj nagłówków markdown do oddzielenia kroków
- Krok "Myślę" powinien być DŁUŻSZY niż finalna odpowiedź`;

function getChatModel(model: unknown): ChatModel {
  return model === "pro" ? "pro" : "flash";
}

export async function POST(request: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: ChatModel } =
    await request.json();

  const selectedModel = getChatModel(model);

  const result = streamText({
    model: chatModel(selectedModel),
    system: thinkingPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
