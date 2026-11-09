import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type AuthStatus = 'loading' | 'unconfigured' | 'signed-out' | 'signed-in';

export interface PasswordSignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signInAsGuest: (displayName: string) => Promise<void>;
  signInWithMagicLink: (email: string, returnTo: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<PasswordSignUpResult>;
  setPassword: (password: string) => Promise<void>;
  upgradeWithEmail: (email: string, password?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function redirectTo(returnTo: string): string {
  const path = returnTo.startsWith('/') ? returnTo : '/';
  return `${window.location.origin}${path}`;
}

function validatePassword(password: string): string {
  if (password.length < 8) {
    throw new Error('Passordet må ha minst 8 tegn.');
  }
  return password;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    isSupabaseConfigured ? 'loading' : 'unconfigured',
  );
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!supabase) {
      setStatus('unconfigured');
      return;
    }

    let active = true;
    let receivedAuthEvent = false;

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      receivedAuthEvent = true;
      setUser(session?.user ?? null);
      setStatus(session?.user ? 'signed-in' : 'signed-out');
    });

    void supabase.auth
      .getSession()
      .then(({ data: sessionData }) => {
        if (!active || receivedAuthEvent) return;
        setUser(sessionData.session?.user ?? null);
        setStatus(sessionData.session?.user ? 'signed-in' : 'signed-out');
      })
      .catch(() => {
        if (active) setStatus('signed-out');
      });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signInAsGuest = useCallback(async (displayName: string) => {
    if (!supabase) throw new Error('Supabase er ikke konfigurert.');
    const name = displayName.trim() || 'Gjest';
    const { error } = await supabase.auth.signInAnonymously({
      options: { data: { display_name: name } },
    });
    if (error) throw error;
  }, []);

  const signInWithMagicLink = useCallback(async (email: string, returnTo: string) => {
    if (!supabase) throw new Error('Supabase er ikke konfigurert.');
    const address = email.trim();
    if (!address) throw new Error('Skriv inn e-postadressen din.');
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: redirectTo(returnTo),
        data: { display_name: address.split('@')[0] ?? 'Bruker' },
      },
    });
    if (error) throw error;
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase er ikke konfigurert.');
    const address = email.trim();
    if (!address) throw new Error('Skriv inn e-postadressen din.');
    if (!password) throw new Error('Skriv inn passordet ditt.');
    const { error } = await supabase.auth.signInWithPassword({
      email: address,
      password,
    });
    if (error) throw error;
  }, []);

  const signUpWithPassword = useCallback(
    async (email: string, password: string): Promise<PasswordSignUpResult> => {
      if (!supabase) throw new Error('Supabase er ikke konfigurert.');
      const address = email.trim();
      if (!address) throw new Error('Skriv inn e-postadressen din.');
      const { data, error } = await supabase.auth.signUp({
        email: address,
        password: validatePassword(password),
        options: {
          data: { display_name: address.split('@')[0] ?? 'Bruker' },
        },
      });
      if (error) throw error;
      return { needsEmailConfirmation: !data.session };
    },
    [],
  );

  const setPassword = useCallback(async (password: string) => {
    if (!supabase) throw new Error('Supabase er ikke konfigurert.');
    const { error } = await supabase.auth.updateUser({
      password: validatePassword(password),
    });
    if (error) throw error;
  }, []);

  const upgradeWithEmail = useCallback(async (email: string, password?: string) => {
    if (!supabase) throw new Error('Supabase er ikke konfigurert.');
    const address = email.trim();
    if (!address) throw new Error('Skriv inn e-postadressen din.');
    const { error } = await supabase.auth.updateUser(
      password ? { email: address, password: validatePassword(password) } : { email: address },
    );
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      signInAsGuest,
      signInWithMagicLink,
      signInWithPassword,
      signUpWithPassword,
      setPassword,
      upgradeWithEmail,
      signOut,
    }),
    [
      status,
      user,
      signInAsGuest,
      signInWithMagicLink,
      signInWithPassword,
      signUpWithPassword,
      setPassword,
      upgradeWithEmail,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth må brukes innenfor AuthProvider.');
  return context;
}
