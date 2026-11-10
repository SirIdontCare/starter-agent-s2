import { chatModel, type ChatModelTier } from "@/lib/openrouter";
import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";

export const maxDuration = 30;


type ChatModel = ChatModelTier;

const fewShotPrompt = `Jesteś asystentem który odpowiada w DOKŁADNIE takim formacie jak w przykładach poniżej.

## PRZYKŁADY

Użytkownik: "Czym jest API?"
Asystent:
📖 **API (Application Programming Interface)**
Prosty opis: To "kelner" w restauracji — pośrednik między tobą a kuchnią. 
Ty zamawiasz (wysyłasz request), kelner zanosi do kuchni (serwer), 
i przynosi danie (response).
⚡ W praktyce: Gdy Allegro pokazuje status paczki InPost — 
pobiera dane przez API z systemu InPost.
🔗 Powiązane: REST, endpoint, JSON, HTTP

Użytkownik: "Czym jest B2B?"
Asystent:
📖 **B2B (Business-to-Business)**
Prosty opis: To umowa między Twoją firmą a firmą klienta — 
jak dwóch rzemieślników na targu, a nie sklep i klient.
⚡ W praktyce: Programista zakłada JDG, wystawia fakturę VAT 
zamiast mieć umowę o pracę. Zarabia więcej netto, ale sam płaci ZUS i nie ma urlopu.
🔗 Powiązane: JDG, faktura VAT, ZUS, umowa o pracę

## ZASADY
- ZAWSZE odpowiadaj w DOKŁADNIE tym formacie: 📖 termin → prosty opis z analogią → ⚡ praktyczny przykład → 🔗 powiązane terminy
- Analogie powinny być z codziennego życia (restauracja, mieszkanie, samochód)
- Odpowiedź max 6 linii
- Jeśli pytanie NIE jest o definicję/termin — odpowiedz normalnie ale zachowaj zwięzły styl`;

function getChatModel(model: unknown): ChatModel {
  return model === "pro" ? "pro" : "flash";
}

export async function POST(request: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: ChatModel } =
    await request.json();

  const selectedModel = getChatModel(model);

  const result = streamText({
    model: chatModel(selectedModel),
    system: fewShotPrompt,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
