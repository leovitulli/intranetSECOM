import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').filter(line => line.includes('=')).forEach(line => {
    const [key, value] = line.split('=');
    env[key.trim()] = value.trim().replace(/^"(.*)"$/, '$1');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function debugDelete() {
    console.log('--- Diagnóstico de Deleção (Backend) ---');
    
    // Tenta listar uma pauta qualquer para pegar um ID de teste
    const { data: testTask } = await supabase.from('tasks').select('id, title').limit(1).single();
    
    if (!testTask) {
        console.log('Nenhuma pauta encontrada para testar.');
        return;
    }

    console.log(`Testando exclusão na pauta: ${testTask.title} (${testTask.id})`);
    
    // Testa a chamada RPC diretamente
    const { error } = await supabase.rpc('delete_task_cascade', { p_task_id: testTask.id });

    if (error) {
        console.error('❌ Erro na RPC:', error.message, '| Código:', error.code);
        if (error.code === 'P0001') console.log('Dica: Erro disparado por RAISE EXCEPTION manual no SQL.');
        if (error.code === '42501') console.log('Dica: Falta de permissão de EXECUTE para usuários anon/auth.');
    } else {
        console.log('✅ RPC disparada com sucesso! O banco deve ter apagado a pauta.');
    }
}

debugDelete();
