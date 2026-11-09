import { useSyncStore } from '../lib/sync-store';

export function LiveRegion() {
  const announcement = useSyncStore((state) => state.announcement);
  const nonce = useSyncStore((state) => state.announcementNonce);

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      <span key={nonce}>{announcement}</span>
    </div>
  );
}
