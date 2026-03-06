import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with actual environment variables or configuration later.
// The user will need to provide their Supabase URL and Anon Key.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
