import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Bypass the Web Locks API (LockManager) that causes 10s timeout in production.
// Safe for SPAs — the lock is only needed for multi-tab session sync which we
// handle via realtime + security_stamp checks instead.
const noOpLock = async <T>(_name: string, _timeout: number, fn: () => Promise<T>): Promise<T> => fn();

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { lock: noOpLock }
}) as any;

// Separate client for admin operations (e.g., creating users) that should not persist a session
let _adminClient: ReturnType<typeof createClient> | null = null;
export const getSupabaseAdmin = () => {
    if (!_adminClient) {
        _adminClient = createClient(supabaseUrl, supabaseKey, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
    }
    return _adminClient;
};
