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
    return 'Innloggingen er ugyldig. Be om en ny innloggingslenke.';
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
