import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { TeamMember } from '../types/team';

export function useTeamData() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [jobFunctions, setJobFunctions] = useState<{ id: string, title: string }[]>([]);
    const [secretarias, setSecretarias] = useState<{ id: string, nome: string }[]>([]);

    const addTeamMember = async (member: TeamMember, password?: string): Promise<boolean> => {
        try {
            if (password) {
                // Chama a função SQL RPC segura que criamos para gerenciar Auth + Public Users
                const { data: userId, error: rpcError } = await supabase.rpc('create_new_user_with_auth', {
                    email:              member.email,
                    password:           password,
                    full_name:          member.name,
                    role_name:          member.role,
                    job_titles_list:    member.job_titles || [],
                    avatar_url_val:     member.avatar_url || '',
                    has_login_val:      member.hasLogin || false
                });

                if (rpcError) throw rpcError;
                
                setTeam(prev => [...prev, { ...member, id: userId }]);
                return true;
            } else {
                // Apenas insere na tabela pública caso não tenha login/senha
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
                return true;
            }
        } catch (error) {
            console.error('Error adding team member:', error);
            return false;
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
                has_login: member.hasLogin
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
