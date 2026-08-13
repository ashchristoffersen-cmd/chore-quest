import type { AppState } from '../types';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const DOC_ID = (import.meta.env.VITE_SYNC_DOC_ID as string | undefined) ?? 'family';

export const syncEnabled = Boolean(URL_BASE && ANON_KEY);

function endpoint(query: string): string {
  return `${URL_BASE}/rest/v1/app_state${query}`;
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: ANON_KEY as string,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/** Fetches the shared document, or null when sync is off or nothing is stored yet. */
export async function pullState(): Promise<AppState | null> {
  if (!syncEnabled) return null;
  const res = await fetch(endpoint(`?id=eq.${DOC_ID}&select=data`), { headers: headers() });
  if (!res.ok) throw new Error(`Sync pull failed: ${res.status}`);
  const rows = (await res.json()) as { data: AppState }[];
  return rows[0]?.data ?? null;
}

export async function pushState(state: AppState): Promise<void> {
  if (!syncEnabled) return;
  const res = await fetch(endpoint(''), {
    method: 'POST',
    headers: headers({ Prefer: 'resolution=merge-duplicates' }),
    body: JSON.stringify([{ id: DOC_ID, data: state, updated_at: state.updatedAt }]),
  });
  if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);
}
