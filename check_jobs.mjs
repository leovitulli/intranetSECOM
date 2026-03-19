import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Lê o arquivo .env.local manualmente
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkJobFunctions() {
    console.log('--- Verificando Tabela job_functions ---');
    const { data, error } = await supabase.from('job_functions').select('*');
    if (error) {
        console.error('Erro:', error.message);
    } else {
        console.log('Total de Funções:', data.length);
        console.table(data);
    }
}

checkJobFunctions();
