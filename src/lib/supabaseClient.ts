import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseKey) as any;

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
