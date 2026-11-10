# 🤖 Starter agenta — grupa zaawansowana LABA S2

To gotowy, kompletny agent AI: chat z narzędziami, baza Supabase, RAG (baza wiedzy), logowanie i personalizacja. — *Paweł*

To Twoja piaskownica: kompletny, działający agent, na którym możesz eksperymentować, psuć i naprawiać bez ryzyka dla projektu z kursu głównego.

## Co jest w środku

| Element | Technologia |
|---|---|
| Aplikacja | Next.js 16 + React 19 + TypeScript |
| Model | OpenRouter przez Vercel AI SDK (`@openrouter/ai-sdk-provider`) |
| Baza, logowanie | Supabase (Postgres + Auth, e-mail i hasło) |
| Baza wiedzy (RAG) | `pgvector`, embeddingi przez OpenRouter (768 wymiarów) |

Całe połączenie z modelami siedzi w jednym pliku: [`lib/openrouter.ts`](lib/openrouter.ts). Endpointy w `app/api/` tylko z niego korzystają.

## Uruchomienie

Potrzebujesz **Node.js 22+**, klucza **OpenRouter od LABA** (tego samego co w kursie) i **nowego, pustego projektu Supabase**.

1. **Pobierz projekt** — w terminalu, w folderze, w którym trzymasz projekty:
   ```bash
   git clone https://github.com/SirIdontCare/starter-agent-s2.git moj-agent-zaawansowany
   ```
   Potem wejdź do środka: `cd moj-agent-zaawansowany`. Od tej chwili to Twój projekt.
2. **Zainstaluj zależności** — w terminalu, w folderze projektu:
   ```bash
   npm install
   ```
3. **Przygotuj bazę** — w nowym projekcie Supabase otwórz **SQL Editor**, wklej całą zawartość pliku [`supabase/schema.sql`](supabase/schema.sql) i uruchom. Powstaną tabele `conversations`, `messages`, `user_profiles` i `documents`.
   > Plików z folderu `supabase/migrations/` **nie uruchamiasz** — służyły do aktualizacji starszej bazy. `schema.sql` zawiera już wszystko.
4. **Uzupełnij klucze** — skopiuj `.env.example` jako `.env.local` i wpisz: klucz OpenRouter od LABA, model z kursowej tabeli `MODELE_DO_CWICZEN.md` oraz URL i anon key nowego projektu Supabase.
5. **Uruchom:**
   ```bash
   npm run dev
   ```
   Otwórz http://localhost:3000, załóż konto na stronie logowania i napisz coś do agenta.

> 💡 Jeśli po rejestracji nie możesz się zalogować — Supabase domyślnie wymaga potwierdzenia adresu e-mail. Kliknij link z maila albo wyłącz to w **Authentication → Sign In / Providers → Email → Confirm email**.

## Co wypróbować

Wszystko jest w menu po lewej. Na początek:

| W menu | Co robi |
|---|---|
| **Chat** | rozmowa z agentem, przełącznik Standard / Pro; rozmowy zapisują się w bazie (**Historia**) |
| **Agent**, **ReAct**, **Podróże** | agent z narzędziami i pętlą ReAct |
| **Szukaj** | wyszukiwanie w internecie |
| **Baza wiedzy**, **Podgląd wiedzy** | wgrywanie dokumentów do RAG i podgląd tego, co trafiło do bazy |
| **Vision**, **Grafiki** | analiza obrazu i generowanie grafik |
| **Myślenie**, **Słownik AI**, **Formatowanie**, **Analizator** | techniki promptowania z kursu |

## Modele i koszty

| Zmienna | Do czego | Domyślnie |
|---|---|---|
| `OPENROUTER_MODEL` | rozmowa, narzędzia, analiza obrazów — przełącznik **Standard** | `openai/gpt-6-luna` |
| `OPENROUTER_MODEL_PRO` | przełącznik **Pro** w czacie | to samo co Standard |
| `OPENROUTER_IMAGE_MODEL` | strona **Grafiki** i narzędzie `generateImage` | `google/gemini-3.1-flash-lite-image` |
| `OPENROUTER_EMBEDDING_MODEL` | baza wiedzy (zapis i wyszukiwanie) | `google/gemini-embedding-2` |

- Starter **nie używa** `CHAT_PASSWORD` ani `SESSION_SECRET` — logowanie robi Supabase Auth.
- Dostęp do modeli grafik, embeddingów i do wyszukiwania musi być dopuszczony na kluczu LABA. Błąd 403 przy tych funkcjach oznacza brak dostępu, a nie błąd w kodzie.
- Model do rozmowy musi obsługiwać **wywoływanie narzędzi** (tool calling), a do strony **Vision** także **obrazy na wejściu**.
- **Wyszukiwanie w internecie** (narzędzie `webSearch`, strona **Szukaj**) korzysta z wtyczki `web` OpenRoutera — każde wyszukanie jest płatne dodatkowo, poza tokenami.
- **Zmiana modelu embeddingów** po wgraniu dokumentów wymaga wgrania ich od nowa — wektory z różnych modeli nie są porównywalne. Model musi zwracać 768 wymiarów.

## Zasady

- `.env.local` **nigdy** nie trafia na GitHuba (pilnuje tego `.gitignore`).
- Starter podpinasz do **własnej, nowej** bazy i wrzucasz do **własnego, nowego** repo — nie do projektu z kursu głównego.
