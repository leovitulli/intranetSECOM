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
            if (taskData.video_captacao_equipe && taskData.video_captacao_equipe.length > 0) {
                finalStatus = 'producao';
            }

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
                p_inauguracao_data: taskData.inauguracao_data?.toISOString().split('T')[0] || null,
                p_pauta_data: (taskData as any).pauta_data || null,
                p_pauta_horario: (taskData as any).pauta_horario || null,
                p_pauta_endereco: (taskData as any).pauta_endereco || null,
                p_pauta_saida: (taskData as any).pauta_saida || null,
                p_is_pauta_externa: (taskData as any).is_pauta_externa || false,
                p_video_captacao_equipe: taskData.video_captacao_equipe || [],
                p_video_captacao_data: taskData.video_captacao_data?.toISOString().split('T')[0] || null,
                p_video_edicao_equipe: taskData.video_edicao_equipe || [],
                p_video_edicao_data: taskData.video_edicao_data?.toISOString().split('T')[0] || null,
                p_video_briefing: taskData.video_briefing || null,
                p_video_necessidades: taskData.video_necessidades || [],
                p_video_entrega_data: taskData.video_entrega_data?.toISOString().split('T')[0] || null,
                p_arte_tipo_pecas: taskData.arte_tipo_pecas || null,
                p_arte_entrega_data: taskData.arte_entrega_data?.toISOString().split('T')[0] || null,
                p_post_criacao_texto: taskData.post_criacao_texto || null,
                p_post_criacao_corrigido: taskData.post_criacao_corrigido || false,
                p_post_aprovado: taskData.post_aprovado || false,
                p_post_alterado_texto: taskData.post_alterado_texto || null,
                p_post_reprovado: taskData.post_reprovado || false,
                p_post_reprovado_comentario: taskData.post_reprovado_comentario || null,
                p_post_material_solicitado: taskData.post_material_solicitado || []
            });

            if (error) {
                console.error("❌ Erro RPC (Hook):", error);
                alert(`Erro ao salvar pauta: ${error.message}`);
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
        const prevTask = tasks.find(t => t.id === updatedTask.id);

        const { error: updateError } = await supabase
            .from('tasks')
            .update({
                title: updatedTask.title,
                description: updatedTask.description,
                status: updatedTask.status,
                type: updatedTask.type,
                creator: updatedTask.creator,
                priority: updatedTask.priority,
                due_date: updatedTask.dueDate?.toISOString() || null,
                inauguracao_nome: updatedTask.inauguracao_nome || null,
                inauguracao_endereco: updatedTask.inauguracao_endereco || null,
                inauguracao_secretarias: updatedTask.inauguracao_secretarias || null,
                inauguracao_tipo: updatedTask.inauguracao_tipo || null,
                inauguracao_checklist: updatedTask.inauguracao_checklist || null,
                inauguracao_data: updatedTask.inauguracao_data?.toISOString().split('T')[0] || null,
                pauta_data: updatedTask.pauta_data || null,
                pauta_horario: updatedTask.pauta_horario || null,
                pauta_endereco: updatedTask.pauta_endereco || null,
                pauta_saida: updatedTask.pauta_saida || null,
                is_pauta_externa: updatedTask.is_pauta_externa || false,
                video_captacao_equipe: updatedTask.video_captacao_equipe || null,
                video_captacao_data: updatedTask.video_captacao_data?.toISOString?.() || null,
                video_edicao_equipe: updatedTask.video_edicao_equipe || null,
                video_edicao_data: updatedTask.video_edicao_data?.toISOString?.() || null,
                video_briefing: updatedTask.video_briefing || null,
                video_necessidades: updatedTask.video_necessidades || null,
                video_entrega_data: updatedTask.video_entrega_data?.toISOString?.() || null,
                arte_tipo_pecas: updatedTask.arte_tipo_pecas || null,
                arte_entrega_data: updatedTask.arte_entrega_data?.toISOString?.() || null,
                post_criacao_texto: updatedTask.post_criacao_texto || null,
                post_criacao_corrigido: updatedTask.post_criacao_corrigido || false,
                post_aprovado: updatedTask.post_aprovado || false,
                post_alterado_texto: updatedTask.post_alterado_texto || null,
                post_reprovado: updatedTask.post_reprovado || false,
                post_reprovado_comentario: updatedTask.post_reprovado_comentario || null,
                post_material_solicitado: updatedTask.post_material_solicitado || [],
                comments: updatedTask.comments || [],
                attachments: updatedTask.attachments || [],
            })
            .eq('id', updatedTask.id);

        if (updateError) {
            console.error('Failed to update task in DB:', updateError);
            return;
        }

        setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));

        // Update Assignees
        await supabase.from('task_assignees').delete().eq('task_id', updatedTask.id);
        if (updatedTask.assignees.length > 0 && team.length > 0) {
            const userIds = team
                .filter(m => updatedTask.assignees.includes(m.name))
                .map(m => m.id);

            if (userIds.length > 0) {
                const assigneesToInsert = userIds.map(uid => ({
                    task_id: updatedTask.id,
                    user_id: uid
                }));
                await supabase.from('task_assignees').insert(assigneesToInsert);
            }
        }

        if (prevTask) {
            if (prevTask.title !== updatedTask.title) await logActivity(updatedTask.id, 'field_edit', `Alterou o título da pauta.`);
            if (prevTask.description !== updatedTask.description) await logActivity(updatedTask.id, 'field_edit', `Editou a descrição.`);
            if (prevTask.priority !== updatedTask.priority) await logActivity(updatedTask.id, 'field_edit', `Prioridade: ${updatedTask.priority.toUpperCase()}`);
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
