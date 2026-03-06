import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// In a real environment, you use the Service Role Key to bypass RLS and create users directly if needed,
// but for this, we can just use signUp with the anon key and then update public.users if needed.
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDeveloper() {
    console.log("Creating developer user leovitulli@gmail.com...");

    // 1. SignUp User
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: 'leovitulli@gmail.com',
        password: '123mudar',
    });

    if (authError) {
        console.error("Error creating auth user:", authError.message);
        return;
    }

    const userId = authData.user?.id;
    if (!userId) {
        console.error("User ID not returned after signup.");
        return;
    }

    console.log("Auth User created! ID:", userId);

    // 2. We need to update or insert into public.users. 
    // Since our setup_roles.sql requires being an admin/dev to insert, this anon client might fail 
    // unless RLS allows inserts for the trigger or we manually do it.
    // However, if the user doesn't exist, we insert them.

    // If RLS blocks it, we will tell the user to run SQL manually for the role.
    const { error: dbError } = await supabase.from('users').upsert({
        id: userId,
        name: 'Leo Vitulli',
        email: 'leovitulli@gmail.com',
        role: 'desenvolvedor'
    });

    if (dbError) {
        console.error("Error inserting into public.users (might be RLS):", dbError.message);
        console.log(`Please run the following SQL manually in Supabase Editor:\nINSERT INTO public.users (id, name, email, role) VALUES ('${userId}', 'Leo Vitulli', 'leovitulli@gmail.com', 'desenvolvedor');`);
    } else {
        console.log("Public user profile successfully created and marked as desenvolvedor!");
    }
}

createDeveloper();
