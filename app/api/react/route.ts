import { LIMIT_ERROR_MESSAGE, chatModel, isLimitError } from "@/lib/openrouter";
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { createReactTools } from "../../lib/tools";
import { authenticateRequest, unauthorizedResponse } from "@/lib/supabase-server";

export const maxDuration = 60;

const safetyPrompt = `
## OBSŁUGA BŁĘDÓW:
- Jeśli narzędzie zwróci błąd — NIE powtarzaj tego samego wywołania.
- Zamiast tego: poinformuj użytkownika i zaproponuj alternatywę.
- Przykład: jeśli pogoda nie działa → "Nie udało się sprawdzić pogody w X. Mogę poszukać w internecie lub spróbować innego miasta."
- NIGDY nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy z rzędu.
- Jeśli po 3 nieudanych próbach nie masz danych — powiedz wprost czego brakuje.`;

const systemPrompt = `Jesteś autonomicznym agentem. Gdy dostajesz ZADANIE (nie pytanie),
MUSISZ je zrealizować krok po kroku.

## TWÓJ PROCES:

Dla KAŻDEGO kroku wypisz:

### 🧠 Myślę...
Co muszę teraz zrobić? Jakie informacje mi brakuje?
Które narzędzie użyć?

Potem UŻYJ narzędzia.

Po otrzymaniu wyniku:

### 👁️ Obserwuję...
Co dostałem? Czy to wystarczy do odpowiedzi?
Jeśli nie — jaki następny krok?

Powtarzaj aż będziesz mieć WSZYSTKO co potrzebne.

Na koniec:

### ✅ Wynik końcowy
Podaj pełną, konkretną odpowiedź opartą na zebranych danych.
Cytuj źródła (API, Wikipedia, internet).

## ZASADY:
- ZAWSZE pokazuj tok pracy w sekcjach: Myślę, Obserwuję, Wynik końcowy.
- NIE zgaduj — jeśli potrzebujesz danych, UŻYJ narzędzia.
- Maksymalnie 5 głównych kroków.
- Jeśli narzędzie zwróci błąd — spróbuj inaczej lub poinformuj.
- ŁĄCZ dane z wielu narzędzi w spójną odpowiedź.
- Nie ujawniaj ukrytego rozumowania; pokazuj krótkie, użytkowe uzasadnienie kroku.

## BAZA WIEDZY FIRMY
- Masz narzędzie \`searchKnowledge\` do wyszukiwania w cennikach, ofertach, FAQ, regulaminach i warunkach firmy.
- Dla pytań o ceny, pakiety, usługi, ofertę, regulamin, procedury lub FAQ ZAWSZE zacznij od \`searchKnowledge\`.
- Odpowiadaj o firmie wyłącznie na podstawie znalezionych fragmentów.
- Gdy narzędzie zwróci 0 wyników lub similarity poniżej 0.5, nie korzystaj z wiedzy ogólnej. Napisz: „Nie mam informacji na ten temat w mojej bazie wiedzy. Skontaktuj się z firmą bezpośrednio.”
- Gdy korzystasz z bazy, ZAWSZE zakończ osobną linią „📎 Źródło: [dokładny tytuł]”. Dla kilku dokumentów użyj „📎 Źródła: [tytuł 1], [tytuł 2]” na podstawie pola \`source_documents\`.
- Nie zastępuj wyszukania w bazie ogólną wiedzą ani wyszukiwaniem w internecie.
${safetyPrompt}`;

function getLastUserText(messages: UIMessage[]) {
  const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");

  return lastUserMessage
    ? lastUserMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("")
    : "";
}

function shouldSearchKnowledge(text: string) {
  return /cennik|pakiet|ofert|cena|koszt|regulamin|warunk|faq|subskrypcj|rezygnac|anulow|usług|uslug|firma|firmow/i.test(
    text,
  );
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  const { messages }: { messages: UIMessage[] } = await request.json();
  const requireKnowledgeSearch = shouldSearchKnowledge(getLastUserText(messages));
  const model = chatModel();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(8),
    toolChoice: "auto",
    tools: createReactTools(auth.supabase, auth.user.id),
    prepareStep: ({ stepNumber }) =>
      requireKnowledgeSearch && stepNumber === 0
        ? { toolChoice: { type: "tool", toolName: "searchKnowledge" } }
        : undefined,
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);

      if (isLimitError(message)) {
        return LIMIT_ERROR_MESSAGE;
      }

      return "Nie udało się pobrać odpowiedzi od modelu.";
    },
  });
}
