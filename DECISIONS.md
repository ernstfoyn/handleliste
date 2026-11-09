# DECISIONS

Korte, bevisste valg for MVP-en. Dato: 2026-11-09.

## Stack og rammeverk

- **React + TypeScript strict + Vite + Tailwind** som PWA. Vite 7 for stabil pluginkompatibilitet,
  React 19, Tailwind 3 med `darkMode: 'media'` (følger systemet uten egen toggle).
- **Supabase** for Postgres, Realtime og Auth. Ingen egen backend — RLS er sikkerhetsgrensen.
- **Dexie/IndexedDB** som lokal sannhet i UI, ikke bare cache. Det gir offline-first og
  optimistisk UI uten å vente på nett.
- **Zustand** for liten global synkstatus; resten av dataene leses med `useLiveQuery` rett fra
  IndexedDB.
- **Vitest** for rene enhetstester. **Playwright** for én kritisk E2E-flyt. **pgTAP** for RLS.

## Local-first og synk

- Alle skrivinger går først til IndexedDB, deretter legges en **outbox**-operasjon i samme
  Dexie-transaksjon. UI oppdateres umiddelbart; ingen spinner for lokale operasjoner.
- Outboxen er persistert i IndexedDB og overlever reload/offline.
- **Klient-genererte UUID-er** brukes for varer og lister. Insert sendes som
  `upsert(..., ignoreDuplicates: true)`, så replay gir ikke duplikater.
- Outboxen sendes **sekvensielt** for å bevare rekkefølgen per entitet.
- Ved vellykket synk tømmes køen, og en full pull rekonsilierer med serveren.
- Ved nettverksfeil stopper synken og prøves igjen ved `online`, fane synlig eller ny handling.
  Ved permanent feil (RLS/validering) pauses køen og banneret tilbyr «Prøv igjen», slik at vi ikke
  hamrer på en feil.
- **Full pull** etter reconnect/realtime er valgt fremfor inkrementell merge. Datasettet er lite i
  MVP, og full pull gjør sletting, RLS og reconnect vesentlig enklere å få riktig. Skaleres til
  inkrementell synk/`updated_at`-cursor senere.
- Pull hopper over rader som har ventende outbox-operasjoner, slik at optimistic UI ikke
  overskrives av en samtidig pull.

## Konflikter

- **Last-write-wins per felt**: klienten sender patches (f.eks. `is_checked` + `checked_at`), ikke
  hele raden. Serveren stempler `updated_at` med `now()` i trigger.
- Outbox-rekkefølgen avgjør hvem som vinner når to offline-enheter skriver samme felt. Det er
  praktisk talt «sist synket vinner», ikke nødvendigvis siste brukerklikk. Dokumentert bevisst
  avveining; klokkestyring unngås ved at serveren stempler.
- **Sletting vinner over redigering**:
  - Varer hard-slettes. En stale update treffer 0 rader og kan ikke gjenopplive raden.
  - Lister myk-slettes (`deleted_at`). RLS-hjelperen `is_list_member` krever `deleted_at is null`,
    så lister som er slettet blir usynlige og ikke redigerbare. Kun eier kan slette (trigger).
  - Angre av vare sletting re-innsetter samme UUID via insert, som er idempotent.
- `record_catalog_use` øker `use_count` bare ved overgangen ukjøpt → kjøpt. Replay av samme
  update gir derfor ikke dobbelttelling.
- Alle varer man legger inn registreres i `item_catalog` med `use_count = 0`; kjøp telles først ved
  avhuking. Det oppfyller «husker alle varer» uten å dobbelttelle legg-til + avhuking.

## Historikk og normalisering

- `item_catalog` er per **husholdning**, ikke per liste. Det gjør historikken gjenbrukbar på tvers
  av lister og forbereder delt husholdning.
- `normalized_name` beregnes på klienten med `normalizeItemName` og lagres på varen. DB-triggeren
  har en enkel fallback, men normaliseringen er bevisst identisk i UI og lagring.
- Normaliseringen: NFKC, lower-case med æøå, trim, kollaps av whitespace, fjerning av avsluttende
  tegn, og iterativ fjerning av enkle norske endelser (`-ene`, `-er`, `-en`, `-et`, `-a`, `-e`).
  Det gir bl.a. `egg` = `egget` = `eggene`, `eple` = `epler`, `øl` = `ølet`.
  Dette er en **heuristikk**, ikke full morfologi; irregulære former som `gulrot/gulrøtter`
  matches ikke. Dokumentert i README.
- Autocomplete rangerer: prefikstreff → `use_count` → `last_used_at` → alfabetisk. Begge
  seksjonene «Ofte brukt» (`use_count >= 2`) og «Nylig brukt» (siste bruk) bruker samme data.

## Deling og sikkerhet

- Invitasjoner er en egen tabell med unikt token (18 tilfeldige bytes), 30 dagers utløp og
  `revoked_at`.
- Innløsning skjer via `accept_list_invite(token)` som `SECURITY DEFINER`. Mottakeren kan ikke
  lese listen før medlemskapet finnes; RPC-en validerer token og setter inn medlemskap.
- RLS på alle tabeller. Hjelpefunksjonene (`is_list_member`, `is_list_owner`,
  `is_household_member`, `shares_list_with`) er `SECURITY DEFINER` med låst `search_path` for å
  unngå resursjon mellom `lists`, `list_members` og `profiles`.
- Kun eier kan slette listen (trigger) og fjerne medlemmer (RLS). Eier kan ikke fjerne seg selv.
- Varer kan legges til, hukes av og slettes av alle medlemmer — det er poenget med felles liste.
- `item_catalog` skrives kun av triggere; klienten kan ikke jukse `use_count`.
- Realtime `postgres_changes` bruker RLS. Presence er en åpen kanal per liste og viser bare
  visningsnavn. Listens UUID er vanskelig å gjette; dette kan hardes med Realtime Authorization senere.

## Auth

- Magic link via Supabase OTP. Ingen passord.
- Anonym gjest (`signInAnonymously`) med valgfritt visningsnavn. Ved oppgradering brukes
  `updateUser({ email })`, som beholder samme `user.id` og dermed alle data.
- Auth-trigger oppretter profil, husholdning og standardliste. `ensure_bootstrap()` er idempotent
  og reparerer manglende data ved innlogging.
- Local cache holdes adskilt per `user.id`; en annen bruker på samme enhet får ren IndexedDB.

## PWA / offline

- `vite-plugin-pwa` med `registerType: 'autoUpdate'`, manifest, maskable ikon og Workbox
  precache av app-skallet. Service worker er av i `vite dev` for å unngå stale cache under
  utvikling; test installasjon med `npm run build && npm run preview`.
- Supabase-API-et caches ikke; offline data kommer fra IndexedDB og outboxen, ikke service worker.
- Offline-banner og «synkroniserer»-status vises først etter relevante hendelser (synkebanneret
  har 600 ms forsinkelse for å unngå flimmer).

## UX og tilgjengelighet

- Mobil først, men samme informasjonsstruktur på desktop. `lang="no"`, `nb-NO`-formatering.
- Minst 44 px hit-targets. Hele vare-raden er en knapp; egen sletteknapp er tastaturtilgjengelig,
  i tillegg til swipe/langt trykk.
- Fokusmarkering, `aria-live` for sanntidsoppdateringer, `role="status"/"alert"` for banner og
  toasts, og redusert bevegelse respekteres.
- Ingen bekreftelsesdialog for avhuking. Angre-toast i 5 sekunder for vare- og «rydd»-sletting.
- Lister slettes med en egen bekreftelsessteg i innstillingene fordi det er destruktivt for alle.

## Testing

- Enhetstester dekker normalisering, rangering og rekonsiliering/retry-klassifisering.
- RLS-testen er en egen pgTAP-fil fordi sikkerhetskravet skal verifiseres i databasen, ikke bare UI.
- Playwright dekker den kritiske flyten med to separate nettleserkontekster og offline-synk.
- `npm test` er bevisst frikoblet fra Supabase/Docker; `test:db` og `test:e2e` krever lokal stack.
