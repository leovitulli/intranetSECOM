import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { Task } from '../types/kanban';
import type { TeamMember } from '../types/team';

interface DataContextType {
    tasks: Task[];
    archivedTasks: Task[];
    team: TeamMember[];
    events: any[];
    suggestions: any[];
    jobFunctions: { id: string, title: string }[];
    onlineUsers: any[];
    loading: boolean;
    updateTaskStatus: (taskId: string, newStatus: Task['status']) => Promise<void>;
    updateTask: (updatedTask: Task) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'comments' | 'attachments'>) => Promise<void>;
    deleteTask: (taskId: string) => Promise<void>;
    archiveTask: (taskId: string) => Promise<void>;
    unarchiveTask: (taskId: string) => Promise<void>;
    addSuggestion: (title: string, description: string, department: string, author: string, attachmentUrls?: string[]) => Promise<void>;
    addJobFunction: (title: string) => Promise<void>;
    updateJobFunction: (id: string, newTitle: string) => Promise<void>;
    removeJobFunction: (id: string) => Promise<void>;
    deleteSuggestion: (suggestionId: string) => Promise<void>;
    addEvent: (eventData: any) => Promise<void>;
    updateEvent: (eventData: any) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [jobFunctions, setJobFunctions] = useState<{ id: string, title: string }[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const { user: currentUser } = useAuth();

    const fetchData = async () => {
        setLoading(true);

        try {
            // Run all primary fetches in parallel for better performance
            const [
                { data: teamData },
                { data: jobFunctionsData },
                { data: tasksResponse },
                { data: eventsData },
                { data: suggestionsData }
            ] = await Promise.all([
                supabase.from('users').select('*').order('name'),
                supabase.from('job_functions').select('*').order('title'),
                supabase.from('tasks').select(`
                    id, title, description, status, type, creator, priority, due_date, archived, archived_at,
                    inauguracao_nome, inauguracao_endereco, inauguracao_secretarias, inauguracao_tipo, inauguracao_checklist, inauguracao_data,
                    pauta_data, pauta_horario, pauta_endereco, pauta_saida, is_pauta_externa,
                    attachments, comments,
                    task_assignees ( users ( name ) )
                `).order('created_at', { ascending: false }),
                supabase.from('events').select(`
                    id, title, date, time, location, type, departure_time, mayor_attending,
                    event_attendees ( user_id )
                `),
                supabase.from('suggestions').select('*').order('created_at', { ascending: false })
            ]);

            // 1. Process Team
            if (teamData) {
                const formattedTeam: TeamMember[] = teamData.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    email: u.email || undefined,
                    phone: undefined,
                    hasLogin: u.role !== 'Motorista',
                    color: 'hsl(210, 100%, 50%)',
                    avatar_url: u.avatar_url || undefined,
                    job_titles: (u.job_titles || []).sort((a: string, b: string) => a.localeCompare(b)),
                }));
                setTeam(formattedTeam);
            }

            // 2. Process Job Functions
            if (jobFunctionsData) {
                setJobFunctions(jobFunctionsData);
            }

            // 3. Process Tasks
            let finalTasksData = tasksResponse;
            if (!tasksResponse) {
                // Fallback for missing columns if migration not fully applied
                const { data: fallbackTasks } = await supabase.from('tasks').select(`
                    id, title, description, status, type, creator, priority, due_date,
                    inauguracao_nome, inauguracao_endereco, inauguracao_secretarias, inauguracao_tipo, inauguracao_checklist, inauguracao_data,
                    pauta_data, pauta_horario, pauta_endereco, pauta_saida, is_pauta_externa,
                    attachments, comments,
                    task_assignees ( users ( name ) )
                `).order('created_at', { ascending: false });
                finalTasksData = fallbackTasks;
            }

            if (finalTasksData) {
                const formatTask = (t: any): Task => ({
                    id: t.id,
                    title: t.title,
                    description: t.description || '',
                    status: t.status as Task['status'],
                    type: t.type as Task['type'],
                    creator: t.creator,
                    priority: t.priority as Task['priority'],
                    dueDate: t.due_date ? new Date(t.due_date) : null,
                    createdAt: t.created_at ? new Date(t.created_at) : new Date(),
                    assignees: t.task_assignees?.map((ta: any) => ta.users?.name).filter(Boolean) || [],
                    comments: t.comments || [],
                    attachments: t.attachments || [],
                    archived: t.archived || false,
                    archived_at: t.archived_at ? new Date(t.archived_at) : null,
                    inauguracao_nome: t.inauguracao_nome || undefined,
                    inauguracao_endereco: t.inauguracao_endereco || undefined,
                    inauguracao_secretarias: Array.isArray(t.inauguracao_secretarias) ? t.inauguracao_secretarias : undefined,
                    inauguracao_tipo: t.inauguracao_tipo || undefined,
                    pauta_data: t.pauta_data || undefined,
                    pauta_horario: t.pauta_horario || undefined,
                    pauta_endereco: t.pauta_endereco || undefined,
                    pauta_saida: t.pauta_saida || undefined,
                    is_pauta_externa: t.is_pauta_externa || false,
                    inauguracao_checklist: (() => {
                        if (!t.inauguracao_checklist) return undefined;
                        if (typeof t.inauguracao_checklist === 'string') {
                            try { return JSON.parse(t.inauguracao_checklist); } catch { return undefined; }
                        }
                        return t.inauguracao_checklist;
                    })(),
                    inauguracao_data: t.inauguracao_data ? new Date(t.inauguracao_data.includes('T') ? t.inauguracao_data : t.inauguracao_data + 'T12:00:00') : undefined,
                });
                setTasks(finalTasksData.filter((t: any) => !t.archived).map(formatTask));
                setArchivedTasks(finalTasksData.filter((t: any) => t.archived).map(formatTask));
            }

            // 4. Process Events
            if (eventsData) {
                const formattedEvents = eventsData.map((e: any) => ({
                    id: e.id,
                    title: e.title,
                    date: new Date(e.date + 'T12:00:00'),
                    time: e.time,
                    location: e.location,
                    type: e.type,
                    departure_time: e.departure_time,
                    mayor_attending: e.mayor_attending,
                    teamIds: e.event_attendees?.map((a: any) => a.user_id) || []
                }));
                setEvents(formattedEvents);
            }

            // 5. Process Suggestions
            if (suggestionsData) {
                const formattedSuggestions = suggestionsData.map((s: any) => ({
                    ...s,
                    date: new Date(s.created_at)
                }));
                setSuggestions(formattedSuggestions);
            }

        } catch (error) {
            console.error("Critical Error fetching data in parallel:", error);
        } finally {
            setLoading(false);
        }
    };

    const logActivity = async (taskId: string, actionType: string, details: string) => {
        if (!taskId.includes('-')) return; // skip if mock id
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

    const updateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
        const prevTask = tasks.find(t => t.id === taskId);
        const prevStatus = prevTask ? prevTask.status : 'desconhecido';

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        await supabase
            .from('tasks')
            .update({ status: newStatus })
            .eq('id', taskId);

        if (prevStatus !== newStatus) {
            await logActivity(taskId, 'status_change', `Moveu de ${prevStatus.toUpperCase()} para ${newStatus.toUpperCase()}`);
        }
    };

    const updateTask = async (updatedTask: Task) => {
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
                comments: updatedTask.comments || [],
                attachments: updatedTask.attachments || [],
            })
            .eq('id', updatedTask.id);

        if (updateError) {
            console.error('Failed to update task in DB:', updateError);
            // Optionally, we could show a toast here
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
            if (prevTask.title !== updatedTask.title) {
                await logActivity(updatedTask.id, 'field_edit', `Alterou o título da pauta.`);
            }
            if (prevTask.description !== updatedTask.description) {
                await logActivity(updatedTask.id, 'field_edit', `Editou a descrição.`);
            }
            if (prevTask.priority !== updatedTask.priority) {
                await logActivity(updatedTask.id, 'field_edit', `Alterou a prioridade para ${updatedTask.priority.toUpperCase()}`);
            }
            if (prevTask.dueDate !== updatedTask.dueDate) {
                const dateStr = updatedTask.dueDate ? updatedTask.dueDate.toLocaleDateString('pt-BR') : 'sem prazo';
                await logActivity(updatedTask.id, 'field_edit', `Alterou o prazo para ${dateStr}`);
            }
            if (JSON.stringify(prevTask.assignees) !== JSON.stringify(updatedTask.assignees)) {
                await logActivity(updatedTask.id, 'assignment', `Atualizou a equipe escalada.`);
            }
        }
    };

    const addTask = async (taskData: Omit<Task, 'id' | 'comments' | 'attachments'>) => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .insert([{
                    title: taskData.title,
                    description: taskData.description,
                    status: taskData.status,
                    type: taskData.type,
                    creator: taskData.creator,
                    priority: taskData.priority,
                    due_date: taskData.dueDate?.toISOString() || null,
                    inauguracao_nome: taskData.inauguracao_nome || null,
                    inauguracao_endereco: taskData.inauguracao_endereco || null,
                    inauguracao_secretarias: taskData.inauguracao_secretarias || null,
                    inauguracao_tipo: taskData.inauguracao_tipo || null,
                    inauguracao_checklist: taskData.inauguracao_checklist || null,
                    inauguracao_data: taskData.inauguracao_data?.toISOString().split('T')[0] || null,
                    pauta_data: (taskData as any).pauta_data || null,
                    pauta_horario: (taskData as any).pauta_horario || null,
                    pauta_endereco: (taskData as any).pauta_endereco || null,
                    pauta_saida: (taskData as any).pauta_saida || null,
                    is_pauta_externa: (taskData as any).is_pauta_externa || false,
                }])
                .select()
                .single();

            if (error) {
                console.error("Supabase Add Task Error:", error);

                // Temporary workaround: If it's a missing column error for the new fields
                if (error.message.includes('column "pauta_data" of relation "tasks" does not exist') || error.code === '42703') {
                    console.log("⚠️ Missing new columns. Retrying without them...");
                    const fallbackTaskData = {
                        title: taskData.title,
                        description: taskData.description,
                        status: taskData.status,
                        type: taskData.type,
                        creator: taskData.creator,
                        priority: taskData.priority,
                        due_date: taskData.dueDate?.toISOString() || null,
                        inauguracao_nome: taskData.inauguracao_nome || null,
                        inauguracao_endereco: taskData.inauguracao_endereco || null,
                        inauguracao_secretarias: taskData.inauguracao_secretarias || null,
                        inauguracao_tipo: taskData.inauguracao_tipo || null,
                        inauguracao_checklist: taskData.inauguracao_checklist || null,
                        inauguracao_data: taskData.inauguracao_data?.toISOString().split('T')[0] || null,
                        pauta_saida: (taskData as any).pauta_saida || null,
                        is_pauta_externa: (taskData as any).is_pauta_externa || false,
                        created_at: new Date().toISOString(),
                    };

                    const retry = await supabase.from('tasks').insert([fallbackTaskData]).select().single();
                    if (retry.error) {
                        alert("Erro ao criar pauta (fallback): " + retry.error.message);
                        return;
                    }

                    // If retry succeeds, proceed to handle it below by re-assigning data and error
                    return processNewTaskData(retry.data, taskData);
                }

                alert("Erro ao criar pauta: " + error.message);
                return;
            }

            if (data) {
                await processNewTaskData(data, taskData);
            }
        } catch (err: any) {
            console.error("Unexpected error in addTask:", err);
            alert("Erro inesperado ao criar pauta: " + err.message);
        }
    };

    const processNewTaskData = async (data: any, taskData: Omit<Task, 'id' | 'comments' | 'attachments'>) => {

        if (data) {
            const newTask: Task = {
                id: data.id,
                title: data.title,
                description: data.description || '',
                status: data.status as Task['status'],
                type: data.type as Task['type'],
                creator: data.creator,
                priority: data.priority as Task['priority'],
                dueDate: data.due_date ? new Date(data.due_date) : null,
                assignees: taskData.assignees,
                comments: [],
                attachments: [],
                inauguracao_nome: taskData.inauguracao_nome,
                inauguracao_endereco: taskData.inauguracao_endereco,
                inauguracao_secretarias: taskData.inauguracao_secretarias,
                inauguracao_tipo: taskData.inauguracao_tipo,
                inauguracao_checklist: taskData.inauguracao_checklist,
                inauguracao_data: taskData.inauguracao_data,
                createdAt: new Date(),
                pauta_saida: (taskData as any).pauta_saida,
            };
            setTasks(prev => [newTask, ...prev]);

            // Handle Assignees
            if (taskData.assignees.length > 0 && team.length > 0) {
                // Find user UUIDs based on names (the current task.assignees expects names)
                const userIds = team
                    .filter(m => taskData.assignees.includes(m.name))
                    .map(m => m.id);

                if (userIds.length > 0) {
                    const assigneesToInsert = userIds.map(uid => ({
                        task_id: data.id,
                        user_id: uid
                    }));
                    await supabase.from('task_assignees').insert(assigneesToInsert);
                }
            }
        }
    };

    const addSuggestion = async (title: string, description: string, department: string, author: string, attachmentUrls: string[] = []) => {
        const { data } = await supabase
            .from('suggestions')
            .insert([{
                title,
                description,
                department,
                author: author || 'Anônimo',
                status: 'pending',
                attachments: attachmentUrls
            }])
            .select()
            .single();

        if (data) {
            const formatted = { ...data, date: new Date(data.created_at) };
            setSuggestions(prev => [formatted, ...prev]);

            // Notify all admins and developers about new suggestion
            try {
                const { data: adminUsers } = await supabase
                    .from('users')
                    .select('id')
                    .in('role', ['admin', 'desenvolvedor']);

                if (adminUsers && adminUsers.length > 0) {
                    const notificationsToInsert = adminUsers.map((u: any) => ({
                        user_id: u.id,
                        title: '💡 Nova Sugestão de Pauta',
                        message: `${data.department}: ${data.title}`,
                        module: 'suggestions',
                        read: false
                    }));
                    await supabase.from('notifications').insert(notificationsToInsert);
                }
            } catch (e) {
                console.warn('Could not notify admins about new suggestion', e);
            }
        }
    };

    const deleteSuggestion = async (suggestionId: string) => {
        try {
            const { error } = await supabase
                .from('suggestions')
                .delete()
                .eq('id', suggestionId);

            if (error) {
                console.error("Error deleting suggestion:", error);
                alert("Erro ao excluir sugestão.");
                return;
            }

            setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
        } catch (error) {
            console.error("Unexpected error deleting suggestion:", error);
        }
    };

    const archiveTask = async (taskId: string) => {
        setTasks(prev => {
            const taskToArchive = prev.find(t => t.id === taskId);
            if (taskToArchive) setArchivedTasks(a => [{ ...taskToArchive, archived: true, archived_at: new Date() }, ...a]);
            return prev.filter(t => t.id !== taskId);
        });

        await supabase
            .from('tasks')
            .update({ archived: true, archived_at: new Date().toISOString() })
            .eq('id', taskId);

        await logActivity(taskId, 'archive', 'Arquivou a pauta.');
    };

    const unarchiveTask = async (taskId: string) => {
        setArchivedTasks(prev => {
            const taskToRestore = prev.find(t => t.id === taskId);
            if (taskToRestore) setTasks(a => [{ ...taskToRestore, archived: false, archived_at: null }, ...a]);
            return prev.filter(t => t.id !== taskId);
        });

        await supabase
            .from('tasks')
            .update({ archived: false, archived_at: null })
            .eq('id', taskId);

        await logActivity(taskId, 'unarchive', 'Desarquivou a pauta.');
    };

    const deleteTask = async (taskId: string) => {
        try {
            // Manual cascade deletion for related tables
            await supabase.from('task_assignees').delete().eq('task_id', taskId);
            await supabase.from('task_logs').delete().eq('task_id', taskId);
            await supabase.from('notifications').delete().eq('message', `Escalado(a) na pauta: "${tasks.find(t => t.id === taskId)?.title}"`);

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error("Error deleting task:", error);
                alert("Erro ao excluir pauta definitivamente: " + error.message);
                return;
            }

            setTasks(prev => prev.filter(t => t.id !== taskId));
            setArchivedTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error("Unexpected error deleting task:", error);
        }
    };

    const addJobFunction = async (title: string) => {
        const { data, error } = await supabase
            .from('job_functions')
            .insert([{ title }])
            .select()
            .single();

        if (error) {
            console.error("Error adding job function:", error);
            throw error;
        }
        if (data) {
            setJobFunctions(prev => [...prev, data].sort((a, b) => a.title.localeCompare(b.title)));
        }
    };

    const updateJobFunction = async (id: string, newTitle: string) => {
        const oldJob = jobFunctions.find(j => j.id === id);
        if (!oldJob) return;

        const oldTitle = oldJob.title;

        // 1. Update the job_functions table
        const { error: jobError } = await supabase
            .from('job_functions')
            .update({ title: newTitle })
            .eq('id', id);

        if (jobError) {
            console.error("Error updating job function:", jobError);
            throw jobError;
        }

        // 2. Cascade update to all users (job_titles is string[])
        try {
            const { data: usersToUpdate } = await supabase
                .from('users')
                .select('id, job_titles')
                .contains('job_titles', [oldTitle]);

            if (usersToUpdate && usersToUpdate.length > 0) {
                for (const u of usersToUpdate) {
                    const newTitles = u.job_titles.map((t: string) => t === oldTitle ? newTitle : t);
                    await supabase.from('users').update({ job_titles: newTitles }).eq('id', u.id);
                }
            }
        } catch (cascadeError) {
            console.warn("Cascade update to users failed:", cascadeError);
            // We don't throw here to avoid blocking the whole operation if just one user fails
        }

        // 3. Update local state
        setJobFunctions(prev => prev.map(jf => jf.id === id ? { ...jf, title: newTitle } : jf).sort((a, b) => a.title.localeCompare(b.title)));
        
        // Also update local team state to reflect changes instantly without refetch
        setTeam(prev => prev.map(m => ({
            ...m,
            job_titles: (m.job_titles || []).map((t: string) => t === oldTitle ? newTitle : t)
        })));
    };

    const removeJobFunction = async (id: string) => {
        const jobToRemove = jobFunctions.find(j => j.id === id);
        if (!jobToRemove) return;

        const { error } = await supabase
            .from('job_functions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error removing job function:", error);
            // If it's a foreign key error or handled restricted delete
            if (error.code === '23503') {
                throw new Error("Este cargo não pode ser removido pois está em uso.");
            }
            throw error;
        }

        setJobFunctions(prev => prev.filter(jf => jf.id !== id));
    };

    const addEvent = async (eventData: any) => {
        const { id, teamIds, ...insertData } = eventData;

        // Convert JS date to local YYYY-MM-DD string (avoid toISOString which converts to UTC and can shift the day)
        const toLocalDateString = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const dbDate = insertData.date ? toLocalDateString(insertData.date) : null;

        const { data, error } = await supabase
            .from('events')
            .insert([{
                title: insertData.title,
                date: dbDate,
                time: insertData.time,
                location: insertData.location,
                type: insertData.type || 'externa', // default type if missing
                departure_time: insertData.departure_time || null,
                mayor_attending: insertData.mayor_attending || false
            }])
            .select()
            .single();

        if (error) {
            console.error("Error adding event:", error);
            throw error;
        }

        if (data) {
            const newEventId = data.id;

            // Handle attendees
            if (teamIds && teamIds.length > 0) {
                const attendeesToInsert = teamIds.map((userId: string) => ({
                    event_id: newEventId,
                    user_id: userId
                }));
                await supabase.from('event_attendees').insert(attendeesToInsert);
            }

            const formattedEvent = {
                id: newEventId,
                title: data.title,
                date: new Date(data.date + 'T12:00:00'),
                time: data.time,
                location: data.location,
                type: data.type,
                departure_time: data.departure_time,
                mayor_attending: data.mayor_attending,
                teamIds: teamIds || []
            };
            setEvents(prev => [...prev, formattedEvent]);
        }
    };

    const updateEvent = async (eventData: any) => {
        const { id, teamIds, ...updateData } = eventData;
        const toLocalDateString = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const dbDate = updateData.date ? toLocalDateString(updateData.date) : null;

        const { error } = await supabase
            .from('events')
            .update({
                title: updateData.title,
                date: dbDate,
                time: updateData.time,
                location: updateData.location,
                type: updateData.type,
                departure_time: updateData.departure_time,
                mayor_attending: updateData.mayor_attending
            })
            .eq('id', id);

        if (error) {
            console.error("Error updating event:", error);
            throw error;
        }

        // Update attendees: simple approach - delete all and re-insert
        await supabase.from('event_attendees').delete().eq('event_id', id);
        if (teamIds && teamIds.length > 0) {
            const attendeesToInsert = teamIds.map((userId: string) => ({
                event_id: id,
                user_id: userId
            }));
            await supabase.from('event_attendees').insert(attendeesToInsert);
        }

        setEvents(prev => prev.map(e => e.id === id ? { ...eventData, date: new Date(eventData.date instanceof Date ? eventData.date.toDateString() + ' 12:00:00' : eventData.date + 'T12:00:00') } : e));
    };

    const deleteEvent = async (id: string) => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    // Subscriptions
    useEffect(() => {
        fetchData();

        const channel = supabase.channel('schema-db-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks' },
                async () => {
                    // Only refetch tasks data — not team/events/suggestions
                    const { data: tasksData, error: tasksError } = await supabase
                        .from('tasks')
                        .select(`
                            *,
                            task_assignees ( users ( name ) )
                        `);
                    if (tasksError) {
                        console.error('Realtime tasks refetch error:', tasksError);
                        return;
                    }
                    if (tasksData) {
                        const formatTask = (t: any) => ({
                            id: t.id,
                            title: t.title,
                            description: t.description || '',
                            status: t.status as Task['status'],
                            type: t.type as Task['type'],
                            creator: t.creator,
                            priority: t.priority as Task['priority'],
                            dueDate: t.due_date ? new Date(t.due_date) : null,
                            createdAt: t.created_at ? new Date(t.created_at) : new Date(),
                            assignees: t.task_assignees?.map((ta: any) => ta.users?.name).filter(Boolean) || [],
                            comments: t.comments || [],
                            attachments: t.attachments || [],
                            archived: t.archived || false,
                            archived_at: t.archived_at ? new Date(t.archived_at) : null,
                            inauguracao_nome: t.inauguracao_nome || undefined,
                            inauguracao_endereco: t.inauguracao_endereco || undefined,
                            inauguracao_secretarias: t.inauguracao_secretarias || undefined,
                            inauguracao_tipo: t.inauguracao_tipo || undefined,
                            inauguracao_checklist: (() => {
                                if (!t.inauguracao_checklist) return undefined;
                                if (typeof t.inauguracao_checklist === 'string') {
                                    try { return JSON.parse(t.inauguracao_checklist); } catch { return undefined; }
                                }
                                return t.inauguracao_checklist;
                            })(),
                            inauguracao_data: t.inauguracao_data ? new Date(t.inauguracao_data.includes('T') ? t.inauguracao_data : t.inauguracao_data + 'T12:00:00') : undefined,
                            pauta_data: t.pauta_data || undefined,
                            pauta_horario: t.pauta_horario || undefined,
                            pauta_endereco: t.pauta_endereco || undefined,
                            pauta_saida: t.pauta_saida || undefined,
                            is_pauta_externa: t.is_pauta_externa || false,
                        });
                        setTasks(tasksData.filter((t: any) => !t.archived).map(formatTask));
                        setArchivedTasks(tasksData.filter((t: any) => t.archived).map(formatTask));
                    }
                }
            )
            .subscribe();

        const suggestionsChannel = supabase.channel('schema-db-suggestions')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'suggestions' },
                (payload: any) => {
                    const newSug = payload.new;
                    const formatted = { ...newSug, date: new Date(newSug.created_at) };
                    setSuggestions(prev => [formatted, ...prev]);

                    // Fire Native Notification for Directors/Everyone
                    if (Notification.permission === 'granted') {
                        new Notification("💡 Nova Sugestão de Pauta!", {
                            body: `${newSug.department}: ${newSug.title}`,
                            icon: '/vite.svg'
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
            supabase.removeChannel(suggestionsChannel);
        };
    }, []);

    // Presence Subscription
    useEffect(() => {
        if (!currentUser) return;

        const presenceChannel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: currentUser.id,
                },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const online = Object.values(state).flat().map((p: any) => p.user);
                
                // Remove duplicates and self if needed (keeping self for UI)
                const uniqueOnline = online.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
                setOnlineUsers(uniqueOnline);
            })
            .subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user: {
                            id: currentUser.id,
                            name: currentUser.name,
                            avatar: currentUser.avatar,
                            role: currentUser.role
                        },
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            presenceChannel.unsubscribe();
        };
    }, [currentUser]);

    return (
        <DataContext.Provider value={{
            tasks, archivedTasks, team, events, suggestions, jobFunctions, onlineUsers,
            loading, updateTaskStatus, updateTask, addTask, deleteTask, archiveTask,
            unarchiveTask, addSuggestion, deleteSuggestion, addJobFunction, updateJobFunction, removeJobFunction,
            addEvent, updateEvent, deleteEvent,
            searchTerm, setSearchTerm
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
