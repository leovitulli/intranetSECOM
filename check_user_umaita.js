const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qmvwylljvyrbtxlrpjkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtdnd5bGxqdnlyYnR4bHJwamtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDYxMTcsImV4cCI6MjA4NzYyMjExN30.kdHo4f9FDHKNPBgnkwLSBpJUbP4J4NnIUzvrCicXqqY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    try {
        console.log('🔍 Buscando por umaita.pires@gmail.com...');
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', 'umaita.pires@gmail.com');

        if (error) {
            console.error('❌ Erro Supabase:', error);
            process.exit(1);
        }

        if (data && data.length > 0) {
            console.log('✅ Usuário encontrado:', JSON.stringify(data, null, 2));
        } else {
            console.log('❓ Usuário não encontrado na tabela "users".');
        }
    } catch (e) {
        console.error('💥 Erro fatal:', e);
        process.exit(1);
    }
}

checkUser();
