import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { Task } from '../types/kanban';
import type { TeamMember } from '../types/team';

// Hooks especializados
import { useTasksData } from '../hooks/useTasksData';
import { useTeamData } from '../hooks/useTeamData';
import { useEventsData } from '../hooks/useEventsData';
import { useSuggestionsData } from '../hooks/useSuggestionsData';
import { formatTaskFromDb } from '../utils/taskUtils';

interface DataContextType {
    tasks: Task[];
    archivedTasks: Task[];
    team: TeamMember[];
    events: any[];
    suggestions: any[];
    jobFunctions: { id: string, title: string }[];
    onlineUsers: any[];
    loading: boolean;
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    // Métodos (expostos pelos hooks)
    updateTaskStatus: (taskId: string, newStatus: Task['status']) => Promise<void>;
    updateTask: (updatedTask: Task) => Promise<void>;
    addTask: (task: Omit<Task, 'id' | 'comments' | 'attachments'>) => Promise<boolean>;
    addTeamMember: (member: TeamMember, password?: string) => Promise<boolean>;
    deleteTask: (taskId: string) => Promise<void>;
    updateTeamMember: (member: TeamMember) => Promise<void>;
    deleteTeamMember: (id: string) => Promise<void>;
    resetUserPassword: (email: string) => Promise<void>;
    archiveTask: (taskId: string) => Promise<void>;
    unarchiveTask: (taskId: string) => Promise<void>;
    addSuggestion: (title: string, description: string, department: string, author: string, attachmentUrls?: string[]) => Promise<void>;
    addJobFunction: (title: string) => Promise<void>;
    updateJobFunction: (id: string, newTitle: string) => Promise<void>;
    removeJobFunction: (id: string) => Promise<void>;
    deleteSuggestion: (suggestionId: string) => Promise<void>;
    addEvent: (eventData: any, teamIds?: string[]) => Promise<void>;
    updateEvent: (eventData: any) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    const { user: currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    const { 
        tasks, setTasks, archivedTasks, setArchivedTasks, 
        addTask, updateTask, updateTaskStatus, deleteTask, archiveTask, unarchiveTask 
    } = useTasksData();

    const { 
        team, setTeam, jobFunctions, setJobFunctions, 
        addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword,
        addJobFunction, updateJobFunction, removeJobFunction 
    } = useTeamData();

    const { events, setEvents, addEvent, updateEvent, deleteEvent } = useEventsData();
    const { suggestions, setSuggestions, addSuggestion, deleteSuggestion } = useSuggestionsData();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [
                { data: teamData },
                { data: jobFunctionsData },
                { data: tasksResponse },
                { data: eventsData },
                { data: suggestionsData }
            ] = await Promise.all([
                supabase.from('users').select('*').order('name'),
                supabase.from('job_functions').select('*').order('title'),
                supabase.from('tasks').select('*, task_assignees(users(name))').order('created_at', { ascending: false }),
                supabase.from('events').select('*, event_attendees(user_id)'),
                supabase.from('suggestions').select('*').order('created_at', { ascending: false })
            ]);

            if (teamData) {
                setTeam(teamData.map((u: any) => ({
                    id: u.id,
                    name: u.name,
                    role: u.role,
                    email: u.email || undefined,
                    hasLogin: u.has_login ?? (u.role !== 'Motorista'),
                    avatar_url: u.avatar_url || undefined,
                    job_titles: (u.job_titles || []).sort(),
                    color: 'hsl(210, 100%, 50%)',
                })));
            }

            if (jobFunctionsData) setJobFunctions(jobFunctionsData);
            if (tasksResponse) {
                setTasks(tasksResponse.filter((t: any) => !t.archived).map(formatTaskFromDb));
                setArchivedTasks(tasksResponse.filter((t: any) => t.archived).map(formatTaskFromDb));
            }
            if (eventsData) {
                setEvents(eventsData.map((e: any) => ({
                    ...e,
                    date: new Date(e.date + 'T12:00:00'),
                    teamIds: e.event_attendees?.map((a: any) => a.user_id) || []
                })));
            }
            if (suggestionsData) {
                setSuggestions(suggestionsData.map((s: any) => ({ ...s, date: new Date(s.created_at) })));
            }
        } catch (error) {
            console.error("Critical Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        const tasksSub = supabase.channel('realtime-tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, async () => {
                const { data } = await supabase.from('tasks').select('*, task_assignees(users(name))').order('created_at', { ascending: false });
                if (data) {
                    setTasks(data.filter((t: any) => !t.archived).map(formatTaskFromDb));
                    setArchivedTasks(data.filter((t: any) => t.archived).map(formatTaskFromDb));
                }
            }).subscribe();

        const suggestionsSub = supabase.channel('realtime-suggestions')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suggestions' }, (payload: any) => {
                const newSug = { ...payload.new, date: new Date(payload.new.created_at) };
                setSuggestions(prev => [newSug, ...prev]);
                if (Notification.permission === 'granted') {
                    new Notification("💡 Nova Sugestão de Pauta!", { body: `${newSug.department}: ${newSug.title}` });
                }
            }).subscribe();

        return () => {
            supabase.removeChannel(tasksSub);
            supabase.removeChannel(suggestionsSub);
        };
    }, []);

    useEffect(() => {
        if (!currentUser) return;
        const channel = supabase.channel('online-users', { config: { presence: { key: currentUser.id } } });
        channel.on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const online = Object.values(state).flat().map((p: any) => p.user);
            setOnlineUsers(online.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i));
        }).subscribe(async (status: any) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, role: currentUser.role },
                    online_at: new Date().toISOString(),
                });
            }
        });
        return () => { channel.unsubscribe(); };
    }, [currentUser]);

    return (
        <DataContext.Provider value={{
            tasks, archivedTasks, team, events, suggestions, jobFunctions, onlineUsers, 
            loading, searchTerm, setSearchTerm,
            updateTaskStatus, updateTask: (task) => updateTask(task, team), addTask, deleteTask, 
            archiveTask, unarchiveTask, addSuggestion, deleteSuggestion,
            addJobFunction, updateJobFunction, removeJobFunction,
            addEvent, updateEvent, deleteEvent,
            addTeamMember, updateTeamMember, deleteTeamMember, resetUserPassword
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
}
