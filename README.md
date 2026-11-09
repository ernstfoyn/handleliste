# Handlelista

Felles handleliste som husker varene dine, huker av med ett trykk og fungerer offline.

MVP-en er bygget som en installérbar PWA med **React + TypeScript (strict) + Vite + Tailwind**,
**Supabase** (Postgres, Realtime, Auth) og en **local-first cache i IndexedDB** med idempotent
outbox. UI er på norsk, mobil først, med mørk modus etter systeminnstilling.

---

## Kjernefunksjoner

- Flere lister per bruker: opprett, gi nytt navn, arkivér, gjenopprett og myk-slett.
- Innlogging med e-post + passord, magisk e-postlenke eller anonym gjestekonto. Passord kan settes
  på en eksisterende konto under **Konto**.
- Én liste kan deles med flere via en unik invitasjonslenke. Eier kan fjerne medlemmer.
- Hurtigregistrering: Enter legger til og beholder fokus. Mengde og notat er valgfritt.
- Autocomplete fra historikken mens du skriver, med prefikstreff → frekvens → sist brukt.
- Historikken bygges fra alle lister du har tilgang til — også varer som aldri ble huket av.
- «Ofte brukt» og «Nylig brukt» på listesiden for ett-trykks gjenopptak.
- Automatisk kategorisering (grønnsaker, frukt, meieri, bakeri, kjøtt/fisk, tørrvarer, frys,
  drikke, snacks, husholdning, annet) og gruppering i listen.
- Ett trykk på hele raden huker av/på. Kjøpte varer havner nederst med strikethrough.
- Slett vare med swipe/langt trykk eller egen knapp, med **Angre** i 5 sekunder.
- «Rydd kjøpte varer» (historikken beholdes).
- Sanntid: alle medlemmer ser endringer uten refresh, med presence-avatars.
- Offline: app-skallet caches av service worker, endringer legges i IndexedDB-kø og synkes
  automatisk når nettet er tilbake. Klient-genererte UUID-er gjør synken idempotent.
- RLS i databasen: ikke-medlemmer får 0 rader og kan ikke skrive.

Se [DECISIONS.md](./DECISIONS.md) for hvorfor ting er gjort slik.

---

## Kom i gang lokalt

### Forutsetninger

- Node.js **20.19+ eller 22.12+** (testet med 22.13)
- npm 10+
- Docker Desktop eller Podman, for Supabase lokalt
- Supabase CLI kjøres via `npx supabase` (ingen global install nødvendig)

### 1. Installer

```bash
npm install
```

### 2. Start Supabase lokalt

```bash
npx supabase start
npx supabase db reset
```

`db reset` kjører alle migrasjonene i `supabase/migrations` og setter opp auth, RLS,
triggere og realtime-publikasjonen.

### 3. Miljøvariabler

```bash
cp .env.example .env.local
npx supabase status
```

Lim inn `API URL` og `anon key` i `.env.local`:

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key fra supabase status>
```

### 4. Start appen

```bash
npm run dev
```

Åpne <http://localhost:5173>. Lokal e-post (magic link) vises i Mailpit på
<http://localhost:54324>.

### Cloud-variant

1. Opprett et prosjekt på supabase.com.
2. Koble repoet til prosjektet og push migrasjonene:

   ```bash
   npx supabase login
   npx supabase link --project-ref <prosjektref>
   npx supabase db push
   ```

   **Uten CLI/databasepassord:** lim inn hele `supabase/apply_all.sql` i
   **SQL Editor** i Supabase Dashboard og kjør den. Filen er en samlet kopi av
   migrasjonene i riktig rekkefølge. Migrasjonene i `supabase/migrations` er
   fortsatt kilden til sannhet.

3. I Supabase Dashboard:
   - **Authentication → Sign In / Providers**: skru på e-post (gir både passord og magic link) og
     **Anonymous Sign-Ins**.
   - **Authentication → URL Configuration**: sett Site URL til appens URL og legg til
     `https://din-app/**` som redirect URL. For lokal testing:
     `http://localhost:5173` og `http://localhost:5173/**`.
4. Sett `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` i hostens miljøvariabler
   (eller `.env.local` lokalt).

---

## Miljøvariabler

| Variabel                 | Påkrevd | Beskrivelse                                 |
| ------------------------ | ------- | ------------------------------------------- |
| `VITE_SUPABASE_URL`      | Ja      | Supabase API URL (lokal eller cloud)        |
| `VITE_SUPABASE_ANON_KEY` | Ja      | Supabase anon public key (trygt i frontend) |

`.env.example` inneholder mal. `.env.local` er git-ignorert. Uten konfigurerte variabler viser
appen en oppsettsveiledning i stedet for å krasje.

---

## Scripts

| Kommando                 | Hva den gjør                                                       |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run dev`            | Vite dev-server på port 5173                                       |
| `npm run build`          | Typecheck (`tsc -b`) + produksjonsbygg med service worker/manifest |
| `npm run preview`        | Serverer produksjonsbygget (test PWA/offline her)                  |
| `npm run lint`           | ESLint, inkludert React hooks og TypeScript                        |
| `npm test`               | Vitest-enhetstester                                                |
| `npm run test:watch`     | Vitest i watch-modus                                               |
| `npm run test:db`        | pgTAP/RLS-test mot lokal Supabase (`supabase test db`)             |
| `npm run test:e2e`       | Playwright kritisk flyt (krever lokal Supabase + `.env.local`)     |
| `npm run icons`          | Genererer PWA-ikonene på nytt                                      |
| `npm run format`         | Prettier over hele repoet                                          |
| `npm run supabase:reset` | `supabase db reset`                                                |

---

## Testing

### Enhetstester (`npm test`)

Dekker:

- normalisering av varenavn (æøå, case, whitespace, enkle flertallsformer)
- autocomplete-rangering (prefiks før frekvens, deretter sist brukt)
- konflikt-/synkelogikk (server-sletting vinner, ventende lokale rader overskrives ikke,
  idempotent replay, klassifisering av retrybare feil)

### RLS-test (`npm run test:db`)

Krever at Supabase lokalt kjører. Testen i `supabase/tests/rls.test.sql` oppretter to brukere og
bekrefter blant annet:

- ikke-medlem får **0 rader** fra listen, varene og invitasjonene
- ikke-medlem får `42501` når hen prøver å skrive
- invitasjons-RPC gir medlemskap og deretter lesetilgang
- bare eier kan slette listen

### Ende-til-ende (`npm run test:e2e`)

```bash
npx playwright install chromium   # første gang
npm run test:e2e
```

Testen i `tests/e2e/critical-flow.spec.ts` krever lokal Supabase og `.env.local`.

Flyten som testes:

1. Bruker A logger inn som gjest og oppretter en liste.
2. A legger til «Brød» med Enter.
3. A lager invitasjonslenke og deler den.
4. Bruker B logger inn som gjest via lenken og ser listen.
5. A huker av «Brød» → B ser endringen innen 2 sekunder.
6. A går offline, legger til «Melk» lokalt, går online igjen.
7. B ser «Melk» etter synk, og A har fortsatt bare én «Melk» etter reload (ingen duplikat).

Testen hoppes over med en tydelig melding dersom Supabase-env mangler.

### Test sanntid med to nettlesere manuelt

1. Start Supabase lokalt og `npm run dev`.
2. Åpne appen i et vanlig vindu og i et **inkognito-vindu** (eller en annen nettleserprofil).
3. Logg inn som to ulike gjester med ulike navn.
4. La A opprette en liste, åpne **Del** → **Lag invitasjonslenke**, og åpne lenken i B.
5. La B bli med. Begge skal se samme liste og hverandres avatarmedlemmer i listen.
6. A legger til en vare eller huker av en vare. B skal se endringen innen ~1–2 sekunder uten
   refresh. `aria-live`-regionen annonserer oppdateringen for skjermlesere.
7. Presence-indikatoren viser hvem som er aktive akkurat nå.

### Test offline manuelt

1. Åpne en liste i Chrome.
2. DevTools → **Network** → **Offline**.
3. Et gult offline-banner vises.
4. Legg til en vare, huk av, slett og angre. Alt skjer lokalt umiddelbart.
5. Sett nettverket tilbake. Banneret forsvinner, køen synkes, og den andre nettleseren ser
   endringene.
6. Last appen på nytt og bekreft at varen bare finnes én gang (idempotent UUID-synk).
7. For installérbar PWA/offline app-skall: `npm run build && npm run preview`, åpne i Chrome og
   velg «Installer app». Service worker caches i produksjonsbygget, ikke i `vite dev`.

---

## Akseptansekriterier – slik verifiserer du dem

| #   | Kriterium                                             | Verifisering                                                                                                                        |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | «Melk» tre ganger → øverst ved «mel»                  | Huk av «Melk» tre ganger (hver avhuking øker `use_count`), begynn å skrive «mel». Enhetstestene dekker prefiks/frekvens/sist brukt. |
| 2   | A huker av «Brød» → B ser det innen 2 s               | Følg sanntidstesten over. Playwright-testen sjekker 2-sekundersgrensen.                                                             |
| 3   | Kjøpt vare nederst + strikethrough + `use_count` øker | Huk av en vare. Den flyttes til «Kjøpt», får gjennomstreking, og `item_catalog.use_count` økes av DB-triggeren.                     |
| 4   | Offline add → synkes uten duplikat                    | Følg offline-testen. Playwright sjekker også at varen kun finnes én gang etter reload.                                              |
| 5   | Ikke-medlem får 0 rader / feil                        | `npm run test:db` (RLS-testen) og direkte `GET /rest/v1/lists?select=*` med en annen brukers token.                                 |
| 6   | `build`, `lint`, `test` grønt fra ren clone           | `npm install && npm run build && npm run lint && npm test`                                                                          |

---

## Arkitektur i korte trekk

```text
React (Vite, TS strict, Tailwind)
├── pages/            auth, lister, liste, join
├── components/       hurtigregistrering, varer, autocomplete, deling, offline-banner
├── hooks/            live queries mot Dexie, presence, relativ tid
├── data/
│   ├── actions.ts    optimistiske handlinger + outbox
│   ├── engine.ts     synk-loop, realtime-abonnement, online/visibility
│   ├── pull.ts       full pull + reconcile
│   └── outbox-send.ts idempotent sending
└── lib/
    ├── db.ts         Dexie-skjema
    ├── normalize.ts  norsk varenormalisering
    ├── autocomplete.ts rangering
    └── sync-core.ts  testbar konfliktlogikk
        │
        ▼
Supabase
├── Postgres + RLS + triggere
├── Realtime (postgres_changes + presence)
└── Auth (passord, magic link + anonym gjest)
```

### Local-first-flyt

1. Handlinger skrives først til IndexedDB og vises umiddelbart i UI.
2. Samtidig legges en outbox-operasjon i IndexedDB (persistert, overlever reload).
3. `syncEngine` sender køen sekvensielt til Supabase når nettet er tilgjengelig.
4. Inserts bruker klient-generert UUID + `ignoreDuplicates`, updates/deletes er idempotente på id.
5. Realtime-eventer og reconnect trigger en full pull. Pull hopper over rader med ventende
   lokale endringer, slik at optimistisk UI ikke overskrives.
6. Sletting vinner: varer hard-slettes, lister myk-slettes, og sletting av en vare kan ikke
   «gjenoppstå» via en stale update.

### Datamodell

`profiles`, `households`, `household_members`, `lists`, `list_members`, `items`,
`item_catalog`, `list_invites`.

Avvik/utvidelser fra utgangspunktet:

- `household_members` er lagt til for å modellere flere medlemmer per husholdning senere.
- `lists.updated_by` + `items.created_by/updated_by` brukes til «sist oppdatert av».
- `items.normalized_name` lagres fra klienten, slik at autocomplete og historikk bruker
  nøyaktig samme normalisering som UI.
- `items.position` er en klientberegnet rekkefølge (store tall, tåler offline).
- `list_invites` med unikt token, utløp og `revoked_at`.

### Sikkerhet

- RLS er slått på for alle tabeller.
- Hjelpefunksjoner er `SECURITY DEFINER` med låst `search_path`, og brukes i policyene for å
  unngå RLS-resursjon.
- `items`, `lists`, `list_members`, `profiles`, `item_catalog` og `households` er lagt til
  `supabase_realtime`-publikasjonen.
- Invitasjoner kan bare leses/opprettes av eier; innløsning skjer via en `SECURITY DEFINER`-RPC
  som validerer token, utløp og at listen ikke er slettet.
- Anon-nøkkelen er offentlig; all tilgangskontroll ligger i RLS.

---

## Deploy

### Vercel

1. Importer repoet. Framework preset: **Vite**.
2. Build command: `npm run build`, output: `dist`.
3. Legg inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY`.
4. `vercel.json` sørger for SPA-rewrite til `index.html`.

### Netlify

Repoet har `netlify.toml` med build command, publish-mappe, Node-versjon og no-cache for
service worker/manifest. `public/_redirects` sørger for SPA-fallback.

1. Importer GitHub-repoet i Netlify (eller bruk `npx netlify-cli init`).
2. Legg inn `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` under
   **Site configuration → Environment variables**.
3. Deploy. Build command og publish directory hentes fra `netlify.toml`.

Husk å oppdatere Supabase **Site URL** og **Redirect URLs** til produksjonsdomenet
(f.eks. `https://handlelisten.netlify.app` og `https://handlelisten.netlify.app/**`), og å kjøre
migrasjonene mot cloud-prosjektet.

### GitHub Actions

`.github/workflows/ci.yml` kjører `npm ci`, Prettier, ESLint, enhetstester og produksjonsbygg på
hver push til `main` og på pull requests. Playwright- og pgTAP-testene krever Supabase/Docker og
kjøres bevisst ikke i den enkle CI-jobben.

---

## Bevisst utelatt i MVP / neste steg

- Priser, budsjett og summering
- Kvitteringsskanning / OCR
- Oppskrifter og ingrediensliste
- Kategoribasert butikkart
- Push-varsler
- AI-forslag
- Betaling / abonnement
- Varerekkefølge med drag-and-drop, manuell kategorioverstyring og butikkseksjoner
- Inkrementell synk (MVP gjør full pull; se DECISIONS)
- Offline kø for invitasjoner, medlemsfjerning og profilendringer (krever nett)
- Flere husholdninger per bruker i UI (datamodellen støtter det)
- Full morfologi i normaliseringen (irregulære former som «gulrot/gulrøtter» matches ikke)
- Private Realtime-kanaler for presence (presence viser bare visningsnavn; listenes UUID er
  vanskelig å gjette, men kan hardes ytterligere med Realtime Authorization)

---

## Feilsøking

- **Appen viser «Koble til Supabase»**: `.env.local` mangler, har placeholder-verdier, eller
  dev-serveren ble ikke restartet etter at env ble endret.
- **Anonymous sign-in feiler**: skru på anonymous sign-ins i Supabase (lokalt i
  `supabase/config.toml`, cloud i Dashboard).
- **Magic link kommer ikke**: sjekk Mailpit på <http://localhost:54324>, og at redirect-URL er
  tillatt i Supabase.
- **Passordinnlogging virker ikke**: eksisterende kontoer må først sette passord under **Konto**.
  Nye kontoer med passord må bekrefte e-posten når «Confirm email» er slått på.
- **«Email rate limit exceeded»**: Supabase sin innebygde e-posttjeneste har strenge grenser
  (typisk et par e-poster i timen). Vent, eller sett opp egen SMTP under
  **Authentication → SMTP Settings**. For rask testing på en ny enhet kan du heller bruke
  invitasjonslenken og bli med som gjest.
- **Realtime virker ikke**: sjekk at migrasjonen `20261109090400_realtime.sql` er kjørt
  (`npx supabase db reset`) og at tabellene er med i `supabase_realtime`-publikasjonen.
- **RLS-testen feiler på pgtap**: `supabase test db` krever at Supabase lokalt kjører.
