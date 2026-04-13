import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember } from '../types/team';

export function useTeamData() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [jobFunctions, setJobFunctions] = useState<{ id: string, title: string }[]>([]);
    const [secretarias, setSecretarias] = useState<{ id: string, nome: string }[]>([]);

    const addTeamMember = async (member: TeamMember, password?: string): Promise<{ success: boolean; error?: string }> => {
        try {
            if (password) {
                // Promise.race garante timeout real de 15s independente do supabase-js
                const rpcCall = supabase.rpc('create_new_user_with_auth', {
                    p_email:              member.email,
                    p_password:           password,
                    p_full_name:          member.name,
                    p_role_name:          member.role,
                    p_job_titles_list:    member.job_titles || [],
                    p_avatar_url_val:     member.avatar_url || '',
                    p_has_login_val:      member.hasLogin || false
                });

                const timeoutPromise = new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT_15S')), 15000)
                );

                const { data: userId, error: rpcError } = await Promise.race([rpcCall, timeoutPromise]);

                if (rpcError) {
                    console.error('RPC Error:', rpcError);
                    return { success: false, error: rpcError.message };
                }

                if (userId) {
                    setTeam(prev => [...prev, { ...member, id: userId as string }]);
                }

                return { success: true };
            } else {
                // Insere na tabela pública para usuários sem login (motoristas, etc)
                const { data, error } = await supabase.from('users').insert([{
                    name:       member.name,
                    role:       member.role,
                    email:      member.email,
                    avatar_url: member.avatar_url,
                    job_titles: member.job_titles,
                    has_login:  false
                }]).select('id').single();

                if (error) throw error;
                setTeam(prev => [...prev, { ...member, id: data.id }]);
                return { success: true };
            }
        } catch (error: any) {
            console.error('Error adding team member:', error);
            const isTimeout = error?.message === 'TIMEOUT_15S';
            return {
                success: false,
                error: isTimeout
                    ? 'A operação demorou mais de 15 segundos. Verifique sua conexão e tente novamente.'
                    : (error.message || error.details || 'Falha desconhecida no banco de dados')
            };
        }
    };

    const updateTeamMember = async (member: TeamMember) => {
        const { error } = await supabase
            .from('users')
            .update({
                name: member.name,
                role: member.role,
                email: member.email,
                avatar_url: member.avatar_url,
                job_titles: member.job_titles,
                has_login: member.hasLogin,
                birth_date: member.birth_date
            })
            .eq('id', member.id);

        if (error) throw error;
        setTeam(prev => prev.map(m => m.id === member.id ? member : m));
    };

    const deleteTeamMember = async (id: string) => {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        setTeam(prev => prev.filter(m => m.id !== id));
    };

    const resetUserPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
    };

    const addJobFunction = async (title: string) => {
        const { data, error } = await supabase.from('job_functions').insert([{ title }]).select().single();
        if (error) throw error;
        if (data) setJobFunctions(prev => [...prev, data]);
    };

    const updateJobFunction = async (id: string, newTitle: string) => {
        const { error } = await supabase.from('job_functions').update({ title: newTitle }).eq('id', id);
        if (error) throw error;
        setJobFunctions(prev => prev.map(f => f.id === id ? { ...f, title: newTitle } : f));
    };

    const removeJobFunction = async (id: string) => {
        const { error } = await supabase.from('job_functions').delete().eq('id', id);
        if (error) throw error;
        setJobFunctions(prev => prev.filter(f => f.id !== id));
    };

    // Secretarias
    const addSecretaria = async (nome: string) => {
        const { data, error } = await supabase.from('secretarias').insert([{ nome }]).select().single();
        if (error) throw error;
        if (data) setSecretarias(prev => [...prev, data]);
    };

    const updateSecretaria = async (id: string, novoNome: string) => {
        const { error } = await supabase.from('secretarias').update({ nome: novoNome }).eq('id', id);
        if (error) throw error;
        setSecretarias(prev => prev.map(s => s.id === id ? { ...s, nome: novoNome } : s));
    };

    const removeSecretaria = async (id: string) => {
        const { error } = await supabase.from('secretarias').delete().eq('id', id);
        if (error) throw error;
        setSecretarias(prev => prev.filter(s => s.id !== id));
    };

    return {
        team, setTeam,
        jobFunctions, setJobFunctions,
        secretarias, setSecretarias,
        addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword,
        addJobFunction, updateJobFunction, removeJobFunction,
        addSecretaria, updateSecretaria, removeSecretaria
    };
}
