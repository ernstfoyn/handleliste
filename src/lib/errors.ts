export function toErrorMessage(error: unknown): string {
  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'string' && error
        ? error
        : typeof error === 'object' &&
            error !== null &&
            'message' in error &&
            typeof error.message === 'string'
          ? error.message
          : '';

  if (/row-level security/i.test(message)) {
    return 'Tilgangen ble avvist av sikkerhetsreglene. Last siden på nytt og prøv igjen.';
  }
  if (/email rate limit exceeded/i.test(message)) {
    return 'For mange e-poster er sendt. Vent litt, eller bruk egen SMTP i Supabase.';
  }
  if (/anonymous sign-ins are disabled/i.test(message)) {
    return 'Anonym innlogging er ikke slått på i Supabase ennå.';
  }
  if (/invalid login credentials/i.test(message)) {
    return 'Feil e-post eller passord. Har du ikke satt passord ennå? Bruk e-postlenke og sett passord under Konto.';
  }
  if (/email not confirmed/i.test(message)) {
    return 'E-posten er ikke bekreftet ennå. Sjekk innboksen og bekreft kontoen.';
  }
  if (/password should be at least|weak password/i.test(message)) {
    return 'Passordet er for svakt. Bruk minst 8 tegn.';
  }
  if (/user already registered/i.test(message)) {
    return 'Det finnes allerede en konto med denne e-posten. Logg inn med passord eller e-postlenke.';
  }
  if (/auth session missing/i.test(message)) {
    return 'Du er ikke innlogget. Logg inn på nytt.';
  }
  if (/duplicate key/i.test(message)) {
    return 'Dette finnes allerede. Last siden på nytt og prøv igjen.';
  }
  if (message) return message;
  return 'Noe gikk galt. Prøv igjen.';
}

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}
