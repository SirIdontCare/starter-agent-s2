import { LIMIT_ERROR_MESSAGE, chatModel, isLimitError } from "@/lib/openrouter";
import {
  convertToModelMessages,
  isStepCount,
  streamText,
  type UIMessage,
} from "ai";
import { createReactTools, webSearchTool } from "../../lib/tools";
import { authenticateRequest, unauthorizedResponse } from "@/lib/supabase-server";

export const maxDuration = 60;

const safetyPrompt = `
## OBSŁUGA BŁĘDÓW:
- Jeśli narzędzie zwróci błąd — NIE powtarzaj tego samego wywołania.
- Zamiast tego: poinformuj użytkownika i zaproponuj alternatywę.
- Przykład: jeśli pogoda nie działa → "Nie udało się sprawdzić pogody w X. Mogę poszukać w internecie lub spróbować innego miasta."
- NIGDY nie wywołuj tego samego narzędzia z tymi samymi argumentami dwa razy z rzędu.
- Jeśli po 3 nieudanych próbach nie masz danych — powiedz wprost czego brakuje.`;

const systemPrompt = `Jesteś profesjonalnym asystentem podróży. Gdy użytkownik opisuje
planowaną podróż, AUTONOMICZNIE zbierasz wszystkie potrzebne informacje.

## TWÓJ PROCES:

Dla każdej podróży MUSISZ sprawdzić:
1. 🌤️ Pogodę w miejscu docelowym (getWeather)
2. 💶 Kurs lokalnej waluty (getExchangeRate)
3. 📅 Dni wolne/święta w kraju docelowym (getHolidays)
4. 📖 Informacje o mieście (searchWikipedia)
5. 🧮 Przeliczenie budżetu jeśli podany (calculator)

Jeśli użytkownik prosi "porównaj X i Y", sprawdź pogodę, waluty, święta i informacje o mieście dla OBU miejsc, a potem przygotuj tabelę porównawczą oraz jasną rekomendację.

Po zebraniu danych, wygeneruj GOTOWY PLAN w formacie:

## 🗺️ Plan podróży: [MIASTO]

### 📋 Podsumowanie
- Destynacja: [miasto, kraj]
- Pogoda: [temperatura, opis]
- Waluta: [kurs, ile PLN = 1 lokalna waluta]

### 🌤️ Pogoda
[Szczegóły pogody + co spakować]

### 💰 Budżet
[Przeliczenia walutowe, orientacyjne koszty]

### 📅 Ważne daty
[Święta, dni wolne — co może być zamknięte?]

### 🏛️ Co zobaczyć
[Na podstawie Wikipedii i internetu — główne atrakcje]

### ✅ Checklist przed wyjazdem
[Lista rzeczy do zrobienia/spakowania]

## ZASADY:
- Używaj PRAWDZIWYCH danych z narzędzi — nie zgaduj.
- Jeśli narzędzie zwróci błąd — poinformuj i kontynuuj.
- Bądź praktyczny — konkretne rady, nie ogólniki.
- Podawaj ceny w PLN oraz w walucie lokalnej, jeśli udało się pobrać kurs.
- Dla walut podawaj zapis: 1 [WALUTA] = [KURS] PLN.
- Dla świąt używaj kodu kraju docelowego, np. DE dla Niemiec, FR dla Francji, CZ dla Czech, AT dla Austrii, GB dla Wielkiej Brytanii, JP dla Japonii, ES dla Hiszpanii, PT dla Portugalii.
- Jeśli data podróży jest nieprecyzyjna, użyj aktualnego roku i zaznacz to w odpowiedzi.
- Formatuj odpowiedź w czytelnym markdown.
${safetyPrompt}`;

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (!auth) return unauthorizedResponse();
  const { messages }: { messages: UIMessage[] } = await request.json();
  const model = chatModel();

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(10),
    toolChoice: "auto",
    tools: {
      ...createReactTools(auth.supabase, auth.user.id),
      webSearch: webSearchTool,
    },
  });

  return result.toUIMessageStreamResponse({
    sendSources: true,
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error);

      if (isLimitError(message)) {
        return LIMIT_ERROR_MESSAGE;
      }

      if (message.includes("connect") || message.includes("EACCES")) {
        return "Serwer nie ma teraz dostępu do internetu, więc nie może pobrać danych podróżnych.";
      }

      return "Nie udało się przygotować planu podróży.";
    },
  });
}
