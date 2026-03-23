import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Task } from '../types/kanban';
import { formatTaskFromDb } from '../utils/taskUtils';

export function useTasksData() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);

    const logActivity = async (taskId: string, actionType: string, details: string) => {
        if (!taskId.includes('-')) return;
        try {
            const { data: sessionData } = await supabase.auth.getUser();
            const user = sessionData?.user;
            if (!user) return;

            const { data: profile } = await supabase.from('users').select('name').eq('id', user.id).single();
            const userName = profile?.name || 'Sistema';

            await supabase.from('task_logs').insert([{
                task_id: taskId,
                user_id: user.id,
                user_name: userName,
                action_type: actionType,
                details
            }]);
        } catch (error) {
            console.error('Failed to log activity', error);
        }
    };

    const addTask = async (taskData: Omit<Task, 'id' | 'comments' | 'attachments'>): Promise<boolean> => {
        try {
            console.log("🚀 Iniciando criação Atômica de Pauta via Hook...");
            
            // Mapear responsáveis para IDs (Necessário para a RPC)
            const { data: teamData } = await supabase.from('users').select('id, name');
            const assigneeIds = (taskData.assignees || [])
                .map(name => teamData?.find((m: any) => m.name === name)?.id)
                .filter(Boolean) as string[];

            let finalStatus = taskData.status || 'solicitado';

            const { data, error } = await supabase.rpc('create_task_atomic', {
                p_title: taskData.title,
                p_description: taskData.description || '',
                p_status: finalStatus,
                p_priority: taskData.priority || 'baixa',
                p_type: taskData.type || [],
                p_creator: taskData.creator || 'Sistema',
                p_due_date: taskData.dueDate?.toISOString() || null,
                p_assignee_ids: assigneeIds || [],
                p_inauguracao_nome: taskData.inauguracao_nome || null,
                p_inauguracao_endereco: taskData.inauguracao_endereco || null,
                p_inauguracao_secretarias: taskData.inauguracao_secretarias || [],
                p_inauguracao_tipo: taskData.inauguracao_tipo || null,
                p_inauguracao_checklist: taskData.inauguracao_checklist || null,
                p_inauguracao_data: taskData.inauguracao_data?.toISOString() || null,
                p_pauta_data: taskData.pauta_data || null,
                p_pauta_horario: taskData.pauta_horario || null,
                p_pauta_endereco: taskData.pauta_endereco || null,
                p_pauta_saida: taskData.pauta_saida || null,
                p_is_pauta_externa: taskData.is_pauta_externa || false,
                p_presenca_prefeito: taskData.presenca_prefeito || false,
                p_secretarias: taskData.secretarias || [],
                p_video_captacao_equipe: taskData.video_captacao_equipe || [],
                p_video_captacao_data: taskData.video_captacao_data?.toISOString() || null,
                p_video_edicao_equipe: taskData.video_edicao_equipe || [],
                p_video_edicao_data: taskData.video_edicao_data?.toISOString() || null,
                p_video_briefing: taskData.video_briefing || null,
                p_video_necessidades: taskData.video_necessidades || [],
                p_video_entrega_data: taskData.video_entrega_data?.toISOString() || null,
                p_arte_tipo_pecas: taskData.arte_tipo_pecas || null,
                p_arte_entrega_data: taskData.arte_entrega_data?.toISOString() || null,
                p_post_criacao_texto: taskData.post_criacao_texto || null,
                p_post_criacao_corrigido: taskData.post_criacao_corrigido || false,
                p_post_aprovado: taskData.post_aprovado || false,
                p_post_alterado_texto: taskData.post_alterado_texto || null,
                p_post_data_postagem: taskData.post_data_postagem || null,
                p_post_horario_postagem: taskData.post_horario_postagem || null,
                p_post_reprovado: taskData.post_reprovado || false,
                p_post_reprovado_comentario: taskData.post_reprovado_comentario || null,
                p_post_material_solicitado: taskData.post_material_solicitado || []
            });

            if (error) {
                console.error("❌ Erro RPC (Hook):", error);
                return false;
            }

            if (data) {
                const newTask = formatTaskFromDb(data);
                setTasks(prev => [newTask, ...prev]);
                return true;
            }
            return false;
        } catch (err: any) {
            console.error("💥 Erro Inesperado (Hook addTask):", err);
            return false;
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
        const prevTask = tasks.find(t => t.id === taskId) || archivedTasks.find(t => t.id === taskId);
        const prevStatus = prevTask ? prevTask.status : 'desconhecido';

        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        const { error } = await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId);

        if (error) {
            console.error('Failed to update status:', error);
        } else if (prevStatus !== newStatus) {
            await logActivity(taskId, 'status_change', `Moveu de ${prevStatus.toUpperCase()} para ${newStatus.toUpperCase()}`);
        }
    };

    const updateTask = async (updatedTask: Task, team: any[]) => {
        try {
            console.log("🛠️ Iniciando atualização Atômica de Pauta via Hook...");
            
            // Mapear responsáveis para IDs
            const assigneeIds = (updatedTask.assignees || [])
                .map(name => team.find(m => m.name === name)?.id)
                .filter(Boolean) as string[];

            const { data, error } = await supabase.rpc('update_task_atomic', {
                p_task_id: updatedTask.id,
                p_title: updatedTask.title,
                p_description: updatedTask.description || '',
                p_status: updatedTask.status,
                p_priority: updatedTask.priority,
                p_type: updatedTask.type || [],
                p_due_date: updatedTask.dueDate?.toISOString() || null,
                p_assignee_ids: assigneeIds || [],
                p_inauguracao_nome: updatedTask.inauguracao_nome || null,
                p_inauguracao_endereco: updatedTask.inauguracao_endereco || null,
                p_inauguracao_secretarias: updatedTask.inauguracao_secretarias || [],
                p_inauguracao_tipo: updatedTask.inauguracao_tipo || null,
                p_inauguracao_checklist: updatedTask.inauguracao_checklist || null,
                p_inauguracao_data: updatedTask.inauguracao_data?.toISOString() || null,
                p_pauta_data: updatedTask.pauta_data || null,
                p_pauta_horario: updatedTask.pauta_horario || null,
                p_pauta_endereco: updatedTask.pauta_endereco || null,
                p_pauta_saida: updatedTask.pauta_saida || null,
                p_is_pauta_externa: updatedTask.is_pauta_externa || false,
                p_presenca_prefeito: updatedTask.presenca_prefeito || false,
                p_secretarias: updatedTask.secretarias || [],
                p_video_captacao_equipe: updatedTask.video_captacao_equipe || [],
                p_video_captacao_data: updatedTask.video_captacao_data?.toISOString?.() || null,
                p_video_edicao_equipe: updatedTask.video_edicao_equipe || [],
                p_video_edicao_data: updatedTask.video_edicao_data?.toISOString?.() || null,
                p_video_briefing: updatedTask.video_briefing || null,
                p_video_necessidades: updatedTask.video_necessidades || [],
                p_video_entrega_data: updatedTask.video_entrega_data?.toISOString?.() || null,
                p_arte_tipo_pecas: updatedTask.arte_tipo_pecas || null,
                p_arte_entrega_data: updatedTask.arte_entrega_data?.toISOString?.() || null,
                p_post_criacao_texto: updatedTask.post_criacao_texto || null,
                p_post_criacao_corrigido: updatedTask.post_criacao_corrigido || false,
                p_post_aprovado: updatedTask.post_aprovado || false,
                p_post_alterado_texto: updatedTask.post_alterado_texto || null,
                p_post_data_postagem: updatedTask.post_data_postagem || null,
                p_post_horario_postagem: updatedTask.post_horario_postagem || null,
                p_post_reprovado: updatedTask.post_reprovado || false,
                p_post_reprovado_comentario: updatedTask.post_reprovado_comentario || null,
                p_post_material_solicitado: updatedTask.post_material_solicitado || []
            });

            if (error) {
                console.error('❌ Erro RPC update_task_atomic:', error);
                return;
            }

            // Atualiza localmente
            if (data) {
                const formatted = formatTaskFromDb(data);
                setTasks(prev => prev.map(t => t.id === updatedTask.id ? formatted : t));
            }
        } catch (err) {
            console.error('💥 Erro Crítico updateTask:', err);
        }
    };

    const deleteTask = async (taskId: string) => {
        try {
            // Se for card temporário (sem UUID do banco)
            if (!taskId.includes('-')) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                return;
            }

            console.log("🛠️ Iniciando exclusão via RPC Cascade...");
            const { error } = await supabase.rpc('delete_task_cascade', { p_task_id: taskId });

            if (error) {
                console.error('❌ Erro ao deletar via RPC:', error);
                // Fallback manual se a RPC falhar/não existir
                await supabase.from('task_assignees').delete().eq('task_id', taskId);
                await supabase.from('tasks').delete().eq('id', taskId);
            }

            // Atualiza o estado local para sumir o card instantaneamente
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (err) {
            console.error('💥 Erro Crítico na exclusão:', err);
        }
    };

    const archiveTask = async (taskId: string) => {
        const { error } = await supabase.from('tasks').update({ archived: true, archived_at: new Date().toISOString() }).eq('id', taskId);
        if (!error) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                setTasks(prev => prev.filter(t => t.id !== taskId));
                setArchivedTasks(prev => [{ ...task, archived: true, archived_at: new Date() }, ...prev]);
                await logActivity(taskId, 'archive', 'Arquivou a pauta.');
            }
        }
    };

    const unarchiveTask = async (taskId: string) => {
        const { error } = await supabase.from('tasks').update({ archived: false, archived_at: null }).eq('id', taskId);
        if (!error) {
            const task = archivedTasks.find(t => t.id === taskId);
            if (task) {
                setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
                setTasks(prev => [{ ...task, archived: false, archived_at: null }, ...prev]);
                await logActivity(taskId, 'unarchive', 'Restaurou a pauta do arquivo.');
            }
        }
    };

    return {
        tasks, setTasks,
        archivedTasks, setArchivedTasks,
        addTask, updateTask, updateTaskStatus, deleteTask, archiveTask, unarchiveTask, logActivity
    };
}
