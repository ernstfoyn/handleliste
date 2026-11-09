import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import type { Profile } from '../lib/types';
import { useAuth } from '../providers/AuthProvider';

export function useMyProfile(): Profile | null | undefined {
  const { user } = useAuth();
  return useLiveQuery(async () => {
    if (!user) return null;
    return (await db.profiles.get(user.id)) ?? null;
  }, [user?.id]);
}
