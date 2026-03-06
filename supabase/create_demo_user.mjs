#!/usr/bin/env node
// Script para criar o usuário de demonstração no Supabase
// Uso: node supabase/create_demo_user.mjs

// INSTRUÇÃO: Edite SERVICE_ROLE_KEY abaixo com o valor encontrado em:
// Supabase Dashboard → Settings → API → service_role key (secret)

const SUPABASE_URL = 'https://qmvwylljvyrbtxlrpjkp.supabase.co';
const SERVICE_ROLE_KEY = 'COLOQUE_AQUI_SUA_SERVICE_ROLE_KEY'; // ⚠️ obrigatório

if (SERVICE_ROLE_KEY === 'COLOQUE_AQUI_SUA_SERVICE_ROLE_KEY') {
    console.error('❌ Por favor, edite este arquivo e informe a SERVICE_ROLE_KEY do Supabase.');
    console.error('   Encontre em: Supabase Dashboard → Settings → API → service_role key');
    process.exit(1);
}

async function createDemoUser() {
    console.log('🔄 Criando usuário de demonstração...');

    // 1. Criar usuário no Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
            email: 'email@secom.br',
            password: '123mudar',
            email_confirm: true,
            user_metadata: { name: 'Demo SECOM' }
        })
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
        if (authData.msg && authData.msg.includes('already been registered')) {
            console.log('ℹ️  Usuário já existe no Auth. Tentando apenas atualizar o perfil...');
            // Buscar ID existente
            const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?filter=email:email@secom.br`, {
                headers: {
                    'apikey': SERVICE_ROLE_KEY,
                    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
                }
            });
            const listData = await listRes.json();
            if (listData.users && listData.users.length > 0) {
                const uid = listData.users[0].id;
                await insertProfile(uid);
            }
        } else {
            console.error('❌ Erro ao criar auth user:', JSON.stringify(authData));
            process.exit(1);
        }
        return;
    }

    const userId = authData.id;
    console.log(`✅ Auth user criado com ID: ${userId}`);

    // 2. Inserir perfil na tabela public.users
    await insertProfile(userId);
}

async function insertProfile(userId) {
    console.log(`🔄 Inserindo perfil em public.users (ID: ${userId})...`);

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
            id: userId,
            name: 'Demo SECOM',
            email: 'email@secom.br',
            role: 'viewer',
            avatar_url: 'https://ui-avatars.com/api/?name=Demo+SECOM&background=4F7BF7&color=fff',
            job_titles: ['Demo']
        })
    });

    if (profileRes.ok || profileRes.status === 201) {
        console.log('');
        console.log('✅ Usuário de demonstração criado com sucesso!');
        console.log('   📧 Email:  email@secom.br');
        console.log('   🔑 Senha:  123mudar');
        console.log('   👤 Role:   viewer (somente leitura)');
        console.log('');
    } else {
        const errText = await profileRes.text();
        console.error('❌ Erro ao inserir perfil:', errText);
    }
}

createDemoUser().catch(err => {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
});
