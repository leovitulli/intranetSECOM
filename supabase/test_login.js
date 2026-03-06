import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
    console.log("Testing login for leovitulli@gmail.com...");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'leovitulli@gmail.com',
        password: '123mudar',
    });

    if (error) {
        console.error("Login failed:", error.message, error.status);
    } else {
        console.log("Login successful! User ID:", data.user?.id);
    }
}

testLogin();
