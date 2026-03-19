import { useState } from 'react';
import { supabase, getSupabaseAdmin } from '../lib/supabaseClient';
import type { TeamMember } from '../types/team';

export function useTeamData() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [jobFunctions, setJobFunctions] = useState<{ id: string, title: string }[]>([]);

    const addTeamMember = async (member: TeamMember, password?: string): Promise<boolean> => {
        try {
            let userId = member.id;

            if (password) {
                const adminClient = getSupabaseAdmin();
                const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
                    email: member.email,
                    password: password,
                    email_confirm: true,
                    user_metadata: { name: member.name, role: member.role }
                });

                if (authError || !authUser.user) throw authError;
                userId = authUser.user.id;
            }

            const { error } = await supabase.from('users').insert([{
                id: userId,
                name: member.name,
                role: member.role,
                email: member.email,
                avatar_url: member.avatar_url,
                job_titles: member.job_titles,
                has_login: member.hasLogin
            }]);

            if (error) throw error;
            setTeam(prev => [...prev, { ...member, id: userId }]);
            return true;
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

    return {
        team, setTeam,
        jobFunctions, setJobFunctions,
        addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword,
        addJobFunction, updateJobFunction, removeJobFunction
    };
}
