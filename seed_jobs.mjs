import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const STANDARD_FUNCTIONS = [
    'Redação / Conteúdo',
    'Fotografia',
    'Produção de Vídeo / Edição',
    'Arte Gráfica / Design',
    'Social Media',
    'Gestão / Coordenação',
    'Motorista',
    'Web / Tecnologia'
];

async function seedJobFunctions() {
    console.log('--- Populando Tabela job_functions ---');
    const { data, error } = await supabase.from('job_functions').insert(
        STANDARD_FUNCTIONS.map(title => ({ title }))
    ).select();

    if (error) {
        console.error('Erro ao popular:', error.message);
    } else {
        console.log('Sucesso! Funções inseridas:', data.length);
        console.table(data);
    }
}

seedJobFunctions();
