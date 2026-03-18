import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import type { Task, Comment } from '../types/kanban';
import type { Attachment } from '../types/kanban';

// ─── Validação de UUID real (substitui o hack task.id.includes('-')) ───────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isRealUUID = (id: string) => UUID_REGEX.test(id);

// ─── Tipos ─────────────────────────────────────────────────────────────────────
export type ActiveTab = 'geral' | 'release' | 'post' | 'video' | 'foto' | 'arte' | 'inauguracao';

export interface ConfirmDialogState {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
}

// ─── Hook principal ────────────────────────────────────────────────────────────
export function useTaskModal(task: Task, onUpdateTask: (t: Task) => void, onClose: () => void) {
    const { user } = useAuth();
    const { archiveTask, unarchiveTask, deleteTask } = useData();

    // ── Estado da tarefa (buffer local) ────────────────────────────────────────
    const [editedTask, setEditedTask] = useState<Task>(() => hydrateTask(task));
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // ── Estado de edição inline por seção ──────────────────────────────────────
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleContent, setEditTitleContent] = useState(task.title);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescContent, setEditDescContent] = useState(task.description);
    const [isEditingAgendamento, setIsEditingAgendamento] = useState(false);
    const [isEditingEquipe, setIsEditingEquipe] = useState(false);
    const [isEditingExtras, setIsEditingExtras] = useState(false);

    // ── Abas ───────────────────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<ActiveTab>('geral');

    // ── Comentários ───────────────────────────────────────────────────────────
    const [newComment, setNewComment] = useState('');

    // ── Anexos ────────────────────────────────────────────────────────────────
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Logs de atividade ────────────────────────────────────────────────────
    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    // ── Modal de confirmação (substitui window.confirm) ───────────────────────
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        open: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    // ── Sincroniza quando a prop `task` muda externamente ────────────────────
    useEffect(() => {
        setEditedTask(hydrateTask(task));
        setEditTitleContent(task.title);
        setEditDescContent(task.description);
        setHasUnsavedChanges(false);
    }, [task]);

    // ── Realtime: logs de atividade ──────────────────────────────────────────
    useEffect(() => {
        if (!isRealUUID(task.id)) return;

        const fetchLogs = async () => {
            const { data } = await supabase
                .from('task_logs')
                .select('*')
                .eq('task_id', task.id)
                .order('created_at', { ascending: false });
            if (data) setActivityLogs(data);
        };
        fetchLogs();

        const channel = supabase
            .channel(`logs-${task.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'task_logs', filter: `task_id=eq.${task.id}` },
                (payload: any) => setActivityLogs(prev => [payload.new, ...prev])
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [task.id]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Abre o modal de confirmação customizado */
    const openConfirm = (title: string, message: string, onConfirm: () => void) => {
        setConfirmDialog({ open: true, title, message, onConfirm });
    };

    const closeConfirm = () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
    };

    /** Atualiza um campo no buffer local e marca alterações pendentes */
    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    /** Salva o buffer no banco via onUpdateTask — NÃO fecha o modal por padrão */
    const handleSave = async (closeAfter = false) => {
        const combinedHorario =
            editedTask.pauta_horario_start && editedTask.pauta_horario_end
                ? `${editedTask.pauta_horario_start} às ${editedTask.pauta_horario_end}`
                : editedTask.pauta_horario_start || editedTask.pauta_horario_end || editedTask.pauta_horario || '';

        const taskToSave: Task = {
            ...editedTask,
            pauta_horario: combinedHorario,
            // secretarias é a fonte de verdade; mantemos o campo legado em sincronia
            inauguracao_secretarias: editedTask.secretarias,
        };

        await onUpdateTask(taskToSave);
        setHasUnsavedChanges(false);
        if (closeAfter) onClose();
    };

    /** Salva inline de uma seção específica sem fechar o modal */
    const handleSaveSection = async (closeSectionFn: () => void) => {
        closeSectionFn();
        await handleSave(false); // não fecha o modal
    };

    /** Adiciona comentário — salva imediatamente e mantém sincronia local */
    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        const comment: Comment = {
            id: Date.now().toString(),
            author: user.name,
            avatar: user.avatar,
            text: newComment,
            date: new Date(),
            tab: activeTab !== 'geral' ? activeTab : undefined,
        };

        // Usa editedTask.comments (buffer local) como base para não perder
        // comentários ainda não salvos em outras seções
        const updatedComments = [...editedTask.comments, comment];

        // Salva imediatamente no servidor
        onUpdateTask({ ...task, comments: updatedComments });

        // Atualiza buffer local
        setEditedTask(prev => ({ ...prev, comments: updatedComments }));
        setNewComment('');
    };

    /** Upload de anexos com timeout */
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingAttachments(true);
        const newAttachments: Attachment[] = [];

        try {
            for (const file of Array.from(files)) {
                let fileType: 'image' | 'video' | 'pdf' | 'file' = 'file';
                if (file.type.startsWith('image/')) fileType = 'image';
                if (file.type.startsWith('video/')) fileType = 'video';
                if (file.type === 'application/pdf') fileType = 'pdf';

                const ext = file.name.split('.').pop();
                const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

                const uploadPromise = supabase.storage
                    .from('task-attachments')
                    .upload(path, file, { upsert: false });

                const timeoutPromise = new Promise<{ error: any }>((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Timeout: a internet pode ter oscilado. Tente novamente.')),
                        15000
                    )
                );

                const result = await Promise.race([uploadPromise, timeoutPromise]) as any;

                if (result?.error) {
                    // Usa o estado de alerta interno ao invés de window.alert
                    openConfirm(
                        'Erro no Upload',
                        `Erro ao anexar "${file.name}": ${result.error.message}`,
                        () => {}
                    );
                    continue;
                }

                const { data } = supabase.storage.from('task-attachments').getPublicUrl(path);

                newAttachments.push({
                    id: `${Date.now()}${Math.random()}`,
                    name: file.name,
                    size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                    type: fileType,
                    url: data.publicUrl,
                });
            }

            if (newAttachments.length > 0) {
                const updatedAttachments = [...(task.attachments || []), ...newAttachments];
                onUpdateTask({ ...task, attachments: updatedAttachments });
                setEditedTask(prev => ({ ...prev, attachments: updatedAttachments }));
            }
        } finally {
            setUploadingAttachments(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /** Remove anexo com confirmação via modal interno */
    const handleRemoveAttachment = (att: Attachment) => {
        openConfirm(
            'Excluir Anexo',
            `Deseja realmente excluir "${att.name}"?`,
            async () => {
                try {
                    const urlParts = att.url.split('/task-attachments/');
                    if (urlParts.length === 2) {
                        const { error } = await supabase.storage
                            .from('task-attachments')
                            .remove([urlParts[1]]);

                        if (error) console.error('Erro ao remover arquivo do storage:', error);
                    }

                    const updatedAttachments = (editedTask.attachments || []).filter(a => a.id !== att.id);
                    setEditedTask(prev => ({ ...prev, attachments: updatedAttachments }));
                    onUpdateTask({ ...task, attachments: updatedAttachments });
                } catch (err) {
                    console.error('Erro inesperado ao excluir anexo:', err);
                }
            }
        );
    };

    /** Arquivar pauta com confirmação */
    const handleArchive = (onArchive?: () => void) => {
        openConfirm(
            'Arquivar Pauta',
            'Deseja mover esta pauta para o arquivo histórico?',
            async () => {
                await archiveTask(task.id);
                if (onArchive) onArchive();
                onClose();
            }
        );
    };

    /** Excluir pauta com confirmação */
    const handleDelete = () => {
        console.log('🚀 Tentando excluir pauta:', task.id);
        openConfirm(
            '⚠️ Excluir Definitivamente',
            'Esta ação apagará todos os dados, anexos e comentários de forma irreversível.',
            async () => {
                console.log('🛠️ Confirmação recebida, chamando deleteTask...');
                await deleteTask(task.id);
                console.log('✅ deleteTask finalizado, fechando modal.');
                onClose();
            }
        );
    };

    /** Descarta alterações locais */
    const handleDiscard = () => {
        setEditedTask(hydrateTask(task));
        setHasUnsavedChanges(false);
    };

    const getDayOfWeek = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            return format(new Date(dateStr + 'T12:00:00'), 'EEEE', { locale: ptBR });
        } catch {
            return '';
        }
    };

    return {
        // estado
        user,
        editedTask,
        hasUnsavedChanges,
        activeTab,
        newComment,
        uploadingAttachments,
        activityLogs,
        confirmDialog,
        fileInputRef,
        // edição inline
        isEditingTitle, setIsEditingTitle,
        editTitleContent, setEditTitleContent,
        isEditingDesc, setIsEditingDesc,
        editDescContent, setEditDescContent,
        isEditingAgendamento, setIsEditingAgendamento,
        isEditingEquipe, setIsEditingEquipe,
        isEditingExtras, setIsEditingExtras,
        // actions
        setActiveTab,
        setNewComment,
        handleFieldChange,
        handleSave,
        handleSaveSection,
        handleAddComment,
        handleFileUpload,
        handleRemoveAttachment,
        handleArchive,
        handleDelete,
        handleDiscard,
        openConfirm,
        closeConfirm,
        getDayOfWeek,
        unarchiveTask,
    };
}

// ─── Helpers puros ─────────────────────────────────────────────────────────────

/** Normaliza a task recebida da prop para o formato do buffer local */
function hydrateTask(task: Task): Task {
    const start = (task.pauta_horario || '').split(' às ')[0] || '';
    const end = (task.pauta_horario || '').split(' às ')[1] || '';
    return {
        ...task,
        pauta_horario_start: start,
        pauta_horario_end: end,
        secretarias: task.secretarias || task.inauguracao_secretarias || [],
    };
}
