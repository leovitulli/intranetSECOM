import React, { useState, useEffect } from 'react';
import type { Task, Comment, TaskType } from '../types/kanban';
import { X, Send, Paperclip, FileText, Image as ImageIcon, Video, File, Activity, Archive, MapPin, Award, RotateCcw, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import FileViewer from './FileViewer';
import type { Attachment } from '../types/kanban';
import { useData } from '../contexts/DataContext';
import './TaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';
import TeamMultiSelect from './TeamMultiSelect';

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => void;
    onArchive?: () => void;
}

export default function TaskModal({ task, onClose, onUpdateTask, onArchive }: TaskModalProps) {
    const { user } = useAuth();
    const { archiveTask, unarchiveTask, deleteTask } = useData();

    const [newComment, setNewComment] = useState('');
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Buffer edits locally
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'release' | 'post' | 'video' | 'foto' | 'arte' | 'inauguracao'>('geral');

    useEffect(() => {
        const start = (task.pauta_horario || '').split(' às ')[0] || '';
        const end = (task.pauta_horario || '').split(' às ')[1] || '';
        setEditedTask({
            ...task,
            pauta_horario_start: start,
            pauta_horario_end: end,
            secretarias: task.secretarias || task.inauguracao_secretarias || []
        });
        setEditTitleContent(task.title);
        setEditDescContent(task.description);
        setHasUnsavedChanges(false);
    }, [task]);

    // Editable states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleContent, setEditTitleContent] = useState(task.title);

    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescContent, setEditDescContent] = useState(task.description);


    const [isEditingAgendamento, setIsEditingAgendamento] = useState(false);
    const [isEditingEquipe, setIsEditingEquipe] = useState(false);
    const [isEditingExtras, setIsEditingExtras] = useState(false);

    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    const getDayOfWeek = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr + 'T12:00:00');
            return format(date, "EEEE", { locale: ptBR });
        } catch (e) {
            return '';
        }
    };



    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        // Consolidar horários de início e término para o campo pauta_horario (string única)
        const combinedHorario = (editedTask.pauta_horario_start && editedTask.pauta_horario_end)
            ? `${editedTask.pauta_horario_start} às ${editedTask.pauta_horario_end}`
            : (editedTask.pauta_horario_start || editedTask.pauta_horario_end || editedTask.pauta_horario || '');

        const taskToSave: Task = {
            ...editedTask,
            pauta_horario: combinedHorario,
            // Sincronizar secretarias com o campo legado para compatibilidade
            inauguracao_secretarias: editedTask.secretarias
        };

        await onUpdateTask(taskToSave);
        setHasUnsavedChanges(false);
        onClose();
    };

    const handleRemoveAttachment = async (e: React.MouseEvent, att: Attachment) => {
        e.stopPropagation();
        
        const confirmDelete = window.confirm(`Deseja realmente excluir o anexo "${att.name}"?`);
        if (!confirmDelete) return;

        try {
            // Extract the path from the URL. The URL format is roughly:
            // .../storage/v1/object/public/task-attachments/12345678-abcd.jpg
            const urlParts = att.url.split('/task-attachments/');
            if (urlParts.length === 2) {
                const filePath = urlParts[1];
                
                // Excluir do storage do supabase
                const { error: storageError } = await supabase.storage
                    .from('task-attachments')
                    .remove([filePath]);

                if (storageError) {
                    console.error('Error removing file from storage:', storageError);
                    alert("Aviso: Houve um erro ao excluir o arquivo físico do servidor, mas ele será removido da pauta.");
                }
            }

            // Atualizar o estado da tarefa
            const updatedAttachments = (editedTask.attachments || []).filter(a => a.id !== att.id);
            
            setEditedTask(prev => ({
                ...prev,
                attachments: updatedAttachments
            }));
            
            onUpdateTask({
                ...task,
                attachments: updatedAttachments
            });

        } catch (err) {
            console.error('Failed to process attachment removal:', err);
            alert("Erro inesperado ao excluir anexo.");
        }
    };

    useEffect(() => {
        const fetchLogs = async () => {
            if (!task.id.includes('-')) return; // skip for mock ids
            const { data } = await supabase
                .from('task_logs')
                .select('*')
                .eq('task_id', task.id)
                .order('created_at', { ascending: false });
            if (data) setActivityLogs(data);
        };
        fetchLogs();

        if (task.id.includes('-')) {
            const channel = supabase
                .channel(`logs-${task.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'task_logs', filter: `task_id=eq.${task.id}` },
                    (payload: any) => {
                        setActivityLogs(prev => [payload.new, ...prev]);
                    }
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [task.id]);

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        const comment: Comment = {
            id: Date.now().toString(),
            author: user.name,
            avatar: user.avatar,
            text: newComment,
            date: new Date(),
            tab: activeTab !== 'geral' ? activeTab : undefined
        };

        // Instantly save comments
        const updatedComments = [...task.comments, comment];
        onUpdateTask({
            ...task,
            comments: updatedComments
        });
        setEditedTask(prev => ({ ...prev, comments: updatedComments }));
        setNewComment('');
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return <FileText size={20} className="file-pdf" />;
            case 'image': return <ImageIcon size={20} className="file-image" />;
            case 'video': return <Video size={20} className="file-video" />;
            default: return <File size={20} className="file-default" />;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadingAttachments(true);
        const newAttachments: Attachment[] = [];

        try {
            for (const file of Array.from(files)) {
                let fileType = 'file';
                if (file.type.startsWith('image/')) fileType = 'image';
                if (file.type.startsWith('video/')) fileType = 'video';
                if (file.type === 'application/pdf') fileType = 'pdf';

                const ext = file.name.split('.').pop();
                const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const uploadPromise = supabase.storage
                    .from('task-attachments')
                    .upload(path, file, { upsert: false });
                
                const timeoutPromise = new Promise<{error: any}>((_, reject) => {
                    setTimeout(() => reject(new Error('O sistema demorou muito para responder (timeout). A internet pode ter oscilado. Tente novamente.')), 15000);
                });

                const uploadResult = await Promise.race([uploadPromise, timeoutPromise]) as any;
                const error = uploadResult?.error;

                if (error) {
                    console.error('Upload Error:', error);
                    alert(`Erro ao anexar ${file.name}: ${error.message}. Você precisa rodar o script SQL de anexos de tarefas.`);
                    continue;
                }

                const { data } = supabase.storage
                    .from('task-attachments')
                    .getPublicUrl(path);

                newAttachments.push({
                    id: Date.now().toString() + Math.random(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: fileType as any,
                    url: data.publicUrl
                });
            }

            if (newAttachments.length > 0) {
                // Instantly save attachments
                onUpdateTask({
                    ...task,
                    attachments: [...(task.attachments || []), ...newAttachments]
                });
                setEditedTask(prev => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), ...newAttachments]
                }));
            }
        } finally {
            setUploadingAttachments(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    const renderCommentsByTab = (tabName?: string) => {
        const filteredComments = editedTask.comments.filter(c => 
            tabName === 'geral' ? (!c.tab || c.tab === 'geral') : c.tab === tabName
        );

        return (
            <>
                <div className="comments-list">
                    {filteredComments.length > 0 ? (
                        filteredComments.map(comment => (
                            <div key={comment.id} className="comment">
                                <img src={comment.avatar} alt={comment.author} className="comment-avatar" />
                                <div className="comment-bubble">
                                    <div className="comment-meta">
                                        <span className="comment-author">{comment.author}</span>
                                        <span className="comment-date">
                                            {format(comment.date, "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <p className="comment-text">{comment.text}</p>
                                </div>
                                {(user?.role === 'admin' || user?.role === 'desenvolvedor' || user?.name === comment.author) && (
                                    <div className="comment-actions" style={{ marginLeft: '10px', display: 'flex', gap: '5px', opacity: 0.5, alignItems: 'center' }}>
                                        <button className="icon-btn-small" title="Excluir (em breve)" style={{ cursor: 'not-allowed' }}><X size={14} /></button>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            Nenhum comentário nesta aba ainda.
                        </p>
                    )}
                </div>

                <form onSubmit={handleAddComment} className="comment-input-area">
                    <img src={user?.avatar} alt="You" className="comment-avatar" />
                    <div className="input-wrapper">
                        <input
                            type="text"
                            placeholder={tabName === 'geral' ? "Escreva um comentário geral..." : `Comentar sobre ${tabName}...`}
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                        />
                        <button type="submit" disabled={!newComment.trim()}>
                            <Send size={18} />
                        </button>
                    </div>
                </form>
            </>
        );
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content nova-pauta-modal" onClick={e => e.stopPropagation()}>
                

                {/* ── Header Premium (padrão) ── */}
                <div className="nova-pauta-header-premium">
                    <div className="header-left-premium">
                        <div className="header-icon-premium">
                            <FileText size={20} />
                        </div>
                        <div className="header-titles-premium">
                            <span className="header-subtitle-premium">Gestão da Pauta</span>
                            {isEditingTitle ? (
                                <h2 style={{ margin: 0 }}>
                                    <input
                                        type="text"
                                        className="edit-textarea"
                                        style={{ fontSize: '1.25rem', fontWeight: 700, border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 8px', width: '100%', minWidth: '300px' }}
                                        value={editTitleContent}
                                        onChange={e => setEditTitleContent(e.target.value)}
                                        onBlur={() => {
                                            setIsEditingTitle(false);
                                            if (editTitleContent.trim() && editTitleContent !== editedTask.title) {
                                                handleFieldChange('title', editTitleContent.trim());
                                            } else {
                                                setEditTitleContent(editedTask.title);
                                            }
                                        }}
                                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        autoFocus
                                    />
                                </h2>
                            ) : (
                                <h2 onClick={() => setIsEditingTitle(true)} style={{ cursor: 'pointer', margin: 0 }} title="Clique para editar o título">
                                    {editedTask.title}
                                </h2>
                            )}
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                {/* ── Faixa de Status e Ações ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.5rem 2rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                    <select
                        className="select-premium"
                        style={{ 
                            width: 'auto', 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            border: `1.5px solid ${
                                editedTask.priority === 'baixa' ? '#16a34a' : 
                                editedTask.priority === 'media' ? '#f59e0b' : '#dc2626'
                            }`, 
                            color: `${
                                editedTask.priority === 'baixa' ? '#15803d' : 
                                editedTask.priority === 'media' ? '#b45309' : '#b91c1c'
                            }`, 
                            background: `${
                                editedTask.priority === 'baixa' ? '#f0fdf4' : 
                                editedTask.priority === 'media' ? '#fef3c7' : '#fef2f2'
                            }` 
                        }}
                        value={editedTask.priority}
                        onChange={(e) => handleFieldChange('priority', e.target.value as any)}
                    >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                    </select>

                    <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: '#e2e8f0', color: '#475569' }}>
                        {editedTask.status.toUpperCase()}
                    </span>

                    <button
                        className="btn-archive-header"
                        style={{ fontSize: '0.7rem', padding: '4px 10px' }}
                        onClick={async () => {
                            if (confirm('Arquivar esta pauta? Ela ficará visível na aba de Histórico.')) {
                                await archiveTask(task.id);
                                if (onArchive) onArchive();
                                onClose();
                            }
                        }}
                    >
                        <Archive size={12} /> Arquivar
                    </button>
                </div>

                {/* --- Barra de Abas --- */}
                <div className="tabs-bar-premium" style={{ padding: '0 2rem', borderBottom: '1px solid #e2e8f0', margin: 0, position: 'sticky', top: 0, background: '#fff', zIndex: 10, flexShrink: 0, display: 'flex', overflowX: 'auto' }}>
                    <button type="button" className={`tab-btn-premium ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Geral</button>
                    <button type="button" data-tab="release" className={`tab-btn-premium ${activeTab === 'release' ? 'active' : ''} ${editedTask.type.includes('release') ? 'has-type' : ''}`} onClick={() => setActiveTab('release')}>📝 Release</button>
                    <button type="button" data-tab="post" className={`tab-btn-premium ${activeTab === 'post' ? 'active' : ''} ${editedTask.type.includes('post') ? 'has-type' : ''}`} onClick={() => setActiveTab('post')}>📱 Post</button>
                    <button type="button" data-tab="video" className={`tab-btn-premium ${activeTab === 'video' ? 'active' : ''} ${editedTask.type.includes('video') ? 'has-type' : ''}`} onClick={() => setActiveTab('video')}>🎬 Vídeo</button>
                    <button type="button" data-tab="foto" className={`tab-btn-premium ${activeTab === 'foto' ? 'active' : ''} ${editedTask.type.includes('foto') ? 'has-type' : ''}`} onClick={() => setActiveTab('foto')}>📸 Foto</button>
                    <button type="button" data-tab="arte" className={`tab-btn-premium ${activeTab === 'arte' ? 'active' : ''} ${editedTask.type.includes('arte') ? 'has-type' : ''}`} onClick={() => setActiveTab('arte')}>🎨 Arte</button>
                    <button type="button" data-tab="inauguracao" className={`tab-btn-premium ${activeTab === 'inauguracao' ? 'active' : ''} ${editedTask.type.includes('inauguracao') ? 'has-type' : ''}`} onClick={() => setActiveTab('inauguracao')}>🏛️ Inauguração</button>
                </div>

                {activeTab === 'geral' && (
                <div className="modal-body">
                    <div className="modal-main-col-premium" style={{ gap: "0" }}>
                        {/* --- Seção 01: Informações da Pauta --- */}
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">01</span>
                                <h3>Informações da Pauta</h3>
                                {!isEditingDesc && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingDesc(true)}>Editar</button>
                                )}
                            </div>
                            
                            {isEditingDesc ? (
                                <div className="edit-desc-form">
                                    <textarea
                                        rows={4}
                                        value={editDescContent}
                                        onChange={e => setEditDescContent(e.target.value)}
                                        className="input-premium-textarea"
                                        placeholder="Breve resumo ou briefing..."
                                        style={{ width: '100%', minHeight: '100px', padding: '12px', fontSize: '0.9rem' }}
                                    />
                                    <div className="edit-actions" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                        <button className="btn-secondary small" onClick={() => {
                                            setIsEditingDesc(false);
                                            setEditDescContent(editedTask.description);
                                        }}>Cancelar</button>
                                        <button className="btn-primary small" onClick={() => {
                                            handleFieldChange('description', editDescContent);
                                            setIsEditingDesc(false);
                                        }}>Concluir</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="task-description" style={{ fontSize: "0.95rem", color: "#475569", lineHeight: '1.6', margin: 0 }}>
                                    {editedTask.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma descrição informada.</span>}
                                </p>
                            )}
                        </div>

                        {/* --- Seção 02: Agendamento e Local --- */}
                        <div className="modal-section-group-premium alternate-bg-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">02</span>
                                <h3>Agendamento e Local</h3>
                                {!isEditingAgendamento && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingAgendamento(true)}>Editar</button>
                                )}
                            </div>

                            {isEditingAgendamento ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Data</label>
                                            <input
                                                type="date"
                                                className="input-premium"
                                                value={editedTask.pauta_data || ''}
                                                onChange={e => handleFieldChange('pauta_data', e.target.value)}
                                            />
                                        </div>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Início</label>
                                            <input
                                                type="time"
                                                className="input-premium"
                                                value={editedTask.pauta_horario_start || ''}
                                                onChange={e => handleFieldChange('pauta_horario_start', e.target.value)}
                                            />
                                        </div>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Término</label>
                                            <input
                                                type="time"
                                                className="input-premium"
                                                value={editedTask.pauta_horario_end || ''}
                                                onChange={e => handleFieldChange('pauta_horario_end', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Endereço Completo</label>
                                            <input
                                                type="text"
                                                className="input-premium"
                                                value={editedTask.pauta_endereco || ''}
                                                onChange={e => handleFieldChange('pauta_endereco', e.target.value)}
                                                placeholder="Local da pauta..."
                                            />
                                        </div>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Saída do Paço</label>
                                            <input
                                                type="time"
                                                className="input-premium"
                                                value={editedTask.pauta_saida || ''}
                                                onChange={e => handleFieldChange('pauta_saida', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div 
                                        className={`pauta-externa-toggle-card-premium ${editedTask.is_pauta_externa ? 'active' : ''}`}
                                        onClick={() => handleFieldChange('is_pauta_externa', !editedTask.is_pauta_externa)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <div className="toggle-info-premium">
                                            <span className="toggle-title-premium">Adicionar à Agenda Externa</span>
                                        </div>
                                        <div className={`toggle-switch-premium ${editedTask.is_pauta_externa ? 'on' : ''}`}>
                                            <div className="toggle-knob-premium"></div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn-primary small" onClick={() => setIsEditingAgendamento(false)}>Concluir Agendamento</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Data</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                                {editedTask.pauta_data ? format(new Date(editedTask.pauta_data + 'T12:00:00'), "dd/MM/yyyy") : '---'}
                                                {editedTask.pauta_data && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>({getDayOfWeek(editedTask.pauta_data)})</span>}
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Horário</div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                                {editedTask.pauta_horario_start || '--:--'} {editedTask.pauta_horario_end ? `às ${editedTask.pauta_horario_end}` : ''}
                                            </div>
                                        </div>
                                        {editedTask.pauta_saida && (
                                            <div>
                                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Saída do Paço</div>
                                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7' }}>{editedTask.pauta_saida}</div>
                                            </div>
                                        )}
                                    </div>

                                    {editedTask.pauta_endereco && (
                                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                <div style={{ width: '32px', height: '32px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                    <MapPin size={18} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>LOCALIZACÃO</div>
                                                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{editedTask.pauta_endereco}</div>
                                                </div>
                                            </div>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedTask.pauta_endereco)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-edit-premium"
                                                style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', background: 'white' }}
                                            >Ver no Mapa</a>
                                        </div>
                                    )}

                                    {editedTask.is_pauta_externa && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '0.75rem', fontWeight: 700, background: '#ecfdf5', padding: '6px 12px', borderRadius: '20px', alignSelf: 'flex-start' }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #d1fae5' }}></div>
                                            AGENDADA PARA EQUIPE EXTERNA
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* --- Seção 03: Equipe e Responsáveis --- */}
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">03</span>
                                <h3>Equipe e Responsáveis</h3>
                                {!isEditingEquipe && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingEquipe(true)}>Editar</button>
                                )}
                            </div>

                            {isEditingEquipe ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Departamento / Secretaria Solicitante</label>
                                        <SecretariasMultiSelect
                                            selected={editedTask.secretarias || []}
                                            onChange={newSecs => handleFieldChange('secretarias', newSecs)}
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Responsáveis na SECOM</label>
                                        <TeamMultiSelect
                                            selected={(editedTask.creator || '').split(',').map(s => s.trim()).filter(Boolean)}
                                            onChange={newCreators => handleFieldChange('creator', newCreators.join(', '))}
                                        />
                                    </div>
                                    {editedTask.is_pauta_externa && (
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">Equipe de Cobertura (Externa)</label>
                                            <TeamMultiSelect
                                                selected={editedTask.assignees || []}
                                                onChange={newAssignees => handleFieldChange('assignees', newAssignees)}
                                            />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn-primary small" onClick={() => setIsEditingEquipe(false)}>Concluir Equipe</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Secretarias</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(editedTask.secretarias || []).length > 0 ? (
                                                (editedTask.secretarias || []).map(s => (
                                                    <span key={s} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: 500 }}>{s}</span>
                                                ))
                                            ) : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma secretaria vinculada.</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Responsáveis</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {editedTask.creator ? (
                                                editedTask.creator.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                                    <span key={c} style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: '6px', border: '1px solid #dbeafe', fontWeight: 500 }}>{c}</span>
                                                ))
                                            ) : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum responsável definido.</span>}
                                        </div>
                                    </div>
                                    {editedTask.assignees && editedTask.assignees.length > 0 && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Equipe Externa</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {editedTask.assignees.map(a => (
                                                    <span key={a} style={{ fontSize: '0.75rem', background: '#f5f3ff', color: '#5b21b6', padding: '4px 10px', borderRadius: '6px', border: '1px solid #ddd6fe', fontWeight: 500 }}>{a}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* --- Seção 04: Configurações e Prioridade --- */}
                        <div className="modal-section-group-premium alternate-bg-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">04</span>
                                <h3>Configurações Extras</h3>
                                {!isEditingExtras && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingExtras(true)}>Editar</button>
                                )}
                            </div>

                            {isEditingExtras ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Nível de Prioridade</label>
                                        <div className="prio-pills-container-premium" style={{ display: 'flex', gap: '0.5rem', marginTop: '4px' }}>
                                            {['baixa', 'media', 'alta'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => handleFieldChange('priority', p)}
                                                    className={`prio-pill-premium ${p} ${editedTask.priority === p ? 'active' : ''}`}
                                                    style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Presença do Prefeito</label>
                                        <div 
                                            className={`pauta-externa-toggle-card-premium ${editedTask.presenca_prefeito ? 'active' : ''}`}
                                            onClick={() => handleFieldChange('presenca_prefeito', !editedTask.presenca_prefeito)}
                                            style={{ margin: 0, padding: '0.75rem', cursor: 'pointer' }}
                                        >
                                            <div className="toggle-info-premium">
                                                <span className="toggle-title-premium" style={{ fontSize: '0.8rem' }}>Presença Confirmada</span>
                                            </div>
                                            <div className={`toggle-switch-premium ${editedTask.presenca_prefeito ? 'on' : ''}`}>
                                                <div className="toggle-knob-premium"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn-primary small" onClick={() => setIsEditingExtras(false)}>Concluir Configurações</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Prioridade:</div>
                                        <span className={`prio-pill-premium ${editedTask.priority}`} style={{ padding: '4px 14px', fontSize: '0.75rem', pointerEvents: 'none', opacity: 1, fontWeight: 700 }}>
                                            {editedTask.priority.toUpperCase()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Presença do Prefeito:</div>
                                        {editedTask.presenca_prefeito ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c2410c', fontSize: '0.75rem', fontWeight: 800, background: '#fff7ed', padding: '4px 12px', borderRadius: '20px', border: '1.5px solid #fed7aa' }}>
                                                <Award size={14} /> CONFIRMADO
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>Não prevista</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* --- Seção de Anexos --- */}
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">05</span>
                                <h3>Anexos ({(editedTask.attachments || []).length})</h3>
                                <button className="btn-edit-premium" style={{ gap: '6px' }} onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachments}>
                                    {uploadingAttachments ? 'Enviando...' : <><Plus size={14} /> Adicionar</>}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    multiple
                                    onChange={handleFileUpload}
                                />
                            </div>
                            
                            {(editedTask.attachments || []).length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                    {editedTask.attachments?.map(att => (
                                        <div 
                                            key={att.id} 
                                            className="attachment-card-premium" 
                                            onClick={() => setViewingFile(att)}
                                            style={{ 
                                                background: 'white', 
                                                border: '1.5px solid #e2e8f0', 
                                                borderRadius: '14px', 
                                                padding: '0.85rem', 
                                                cursor: 'pointer', 
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.85rem',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                            }}
                                            onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                                            onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'; }}
                                        >
                                            <div style={{ width: '42px', height: '42px', background: '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                                {getFileIcon(att.type)}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{att.size}</div>
                                            </div>
                                            <button 
                                                className="att-delete-btn-premium"
                                                onClick={(e) => handleRemoveAttachment(e, att)}
                                                style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: '6px', cursor: 'pointer', transition: 'all 0.2s', borderRadius: '6px' }}
                                                onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                                                onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0', marginTop: '1rem' }}>
                                    <Paperclip size={24} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Nenhum anexo adicionado nesta pauta ainda.</div>
                                </div>
                            )}
                        </div>

                        {/* --- Seção: Discussão Geral --- */}
                        <div className="modal-section-group-premium" style={{ borderBottom: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ width: '6px', height: '24px', background: 'linear-gradient(to bottom, #3b82f6, #60a5fa)', borderRadius: '4px' }}></div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>Discussão Geral</h3>
                            </div>
                            <div style={{ paddingLeft: '1.25rem' }}>
                                {renderCommentsByTab('geral')}
                            </div>
                        </div>
                    </div>

                    {/* --- Barra Lateral Premium (Simplificada) --- */}
                    <div className="modal-side-col-premium">
                        
                        {/* Status e Fluxo */}
                        <div className="side-section-premium">
                            <div className="side-title-premium" style={{ color: '#64748b' }}>STATUS DA PAUTA</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className={`status-badge-premium ${editedTask.status}`} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', borderRadius: '10px' }}>
                                    {editedTask.status.toUpperCase()}
                                </div>
                                
                                <select
                                    className="select-premium"
                                    style={{ width: '100%', padding: '8px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 600 }}
                                    value={editedTask.status}
                                    onChange={(e) => handleFieldChange('status', e.target.value)}
                                >
                                    <option value="solicitado">Mudar para: Solicitado</option>
                                    <option value="producao">Mudar para: Em Produção</option>
                                    <option value="correcao">Mudar para: Correção</option>
                                    <option value="aprovado">Mudar para: Aprovado</option>
                                    <option value="publicado">Mudar para: Publicado</option>
                                    <option value="cancelado">Mudar para: Cancelado</option>
                                </select>
                            </div>
                        </div>

                        {/* Ações de Gestão */}
                        <div className="side-section-premium">
                            <div className="side-title-premium" style={{ color: '#64748b' }}>GESTÃO</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {editedTask.archived ? (
                                    <button className="btn-side-action-premium" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }} onClick={async () => { await unarchiveTask(task.id); onClose(); }}>
                                        <RotateCcw size={16} /> Reativar Pauta
                                    </button>
                                ) : (
                                    <button className="btn-side-action-premium" onClick={async () => { if (confirm('Deseja mover esta pauta para o arquivo histórico?')) { await archiveTask(task.id); if (onArchive) onArchive(); onClose(); } }}>
                                        <Archive size={16} /> Arquivar Pauta
                                    </button>
                                )}

                                {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                                    <button className="btn-side-action-premium danger" style={{ marginTop: '0.5rem' }} onClick={async () => { if (confirm('⚠️ ATENCÃO: EXCLUIR DEFINITIVAMENTE?\nEsta ação apagará todos os dados, anexos e comentários de forma irreversível.')) { await deleteTask(task.id); onClose(); } }}>
                                        <Trash2 size={16} /> Excluir Pauta
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Histórico Consolidado */}
                        <div className="side-section-premium" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div className="side-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                <Activity size={14} /> HISTÓRICO DE ATIVIDADES
                            </div>
                            <div className="activity-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px', marginTop: '4px' }}>
                                {activityLogs.length > 0 ? (
                                    activityLogs.map((log, idx) => (
                                        <div key={log.id} style={{ fontSize: '0.75rem', borderLeft: '2px solid #f1f5f9', paddingLeft: '14px', position: 'relative' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === 0 ? '#3b82f6' : '#e2e8f0', position: 'absolute', left: '-5px', top: '4px', boxShadow: idx === 0 ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none' }}></div>
                                            <div style={{ fontWeight: 700, color: '#334155' }}>{log.user_name}</div>
                                            <div style={{ color: '#64748b', margin: '3px 0', lineHeight: '1.4' }}>{log.details}</div>
                                            <div style={{ color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 600 }}>{format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#cbd5e1' }}>
                                        <Activity size={20} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                        <p style={{ fontSize: '0.7rem', fontStyle: 'italic', margin: 0 }}>Nenhuma atividade registrada.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Banner de Salvamento Flutuante (dentro da sidebar pra manter o padrão de visualização) */}
                        {hasUnsavedChanges && (
                            <div className="save-banner-premium" style={{ 
                                marginTop: 'auto', 
                                padding: '1.25rem', 
                                background: '#1e293b', 
                                borderRadius: '16px', 
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
                                animation: 'slideUp 0.3s ease-out'
                            }}>
                                <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                    <div style={{ width: '6px', height: '6px', background: '#f59e0b', borderRadius: '50%' }}></div>
                                    Alterações não salvas
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-save-banner-cancel-premium" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }} onClick={() => { setEditedTask(task); setHasUnsavedChanges(false); }}>Descartar</button>
                                    <button className="btn-save-banner-confirm-premium" style={{ flex: 1, padding: '8px', fontSize: '0.75rem' }} onClick={handleSave}>Salvar Tudo</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                )}

                {activeTab === 'release' && (
                    <div className="modal-body">
                        <div className="modal-main-col-premium" style={{ gap: "0" }}>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">📝</span>
                                    <h3>Produção de Release</h3>
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Os campos dedicados para produção de Release serão construídos aqui em breve.</p>
                            </div>
                            
                            <section className="modal-section-group-premium">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão do Release</h3>
                                {renderCommentsByTab('release')}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'post' && (
                    <div className="modal-body">
                        <div className="modal-main-col-premium" style={{ gap: "0" }}>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">📱</span>
                                    <h3>Estratégia de Social Media</h3>
                                </div>
                                
                                <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                    <label className="field-label-premium">CRIAÇÃO DO TEXTO (DESCRIÇÃO)</label>
                                    <textarea
                                        className="input-premium-textarea"
                                        rows={6}
                                        placeholder="Escreva a legenda sugerida para o post..."
                                        value={editedTask.post_criacao_texto || ''}
                                        onChange={e => handleFieldChange('post_criacao_texto', e.target.value)}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginTop: '0.75rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!editedTask.post_criacao_corrigido}
                                            onChange={e => handleFieldChange('post_criacao_corrigido', e.target.checked)}
                                            style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                                        />
                                        Texto de Criação Corrigido
                                    </label>
                                </div>

                                <div className="modal-section-group-premium alternate-bg-premium" style={{ margin: '0 -2rem', padding: '1.5rem 2rem' }}>
                                    <div className="section-header-premium">
                                        <span className="section-number-premium" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>✓</span>
                                        <h3>Controle de Aprovação</h3>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                        {/* Aprovado */}
                                        <div className={`pauta-externa-toggle-card-premium ${editedTask.post_aprovado ? 'active' : ''}`}
                                            onClick={() => {
                                                const newVal = !editedTask.post_aprovado;
                                                handleFieldChange('post_aprovado', newVal);
                                                if (newVal) {
                                                    handleFieldChange('post_reprovado', false);
                                                }
                                            }}>
                                            <div className="toggle-info-premium">
                                                <span className="toggle-title-premium">Post Aprovado</span>
                                                <span className="toggle-description-premium">Pronto para publicação</span>
                                            </div>
                                            <div className={`toggle-switch-premium ${editedTask.post_aprovado ? 'on' : ''}`}>
                                                <div className="toggle-knob-premium"></div>
                                            </div>
                                        </div>

                                        {/* Alterado / Corrigido */}
                                        <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                            <div className="nova-pauta-field-premium">
                                                <label className="field-label-premium">FOI ALTERADO / CORRIGIDO?</label>
                                                <textarea
                                                    className="input-premium-textarea"
                                                    rows={2}
                                                    placeholder="Descreva o que foi alterado ou o que precisa ser corrigido..."
                                                    value={editedTask.post_alterado_texto || ''}
                                                    onChange={e => handleFieldChange('post_alterado_texto', e.target.value)}
                                                    style={{ fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>

                                        {/* Reprovado / Cancelado */}
                                        <div style={{ background: editedTask.post_reprovado ? '#fff1f2' : 'white', padding: '1.25rem', borderRadius: '12px', border: editedTask.post_reprovado ? '1.5px solid #fda4af' : '1.5px solid #e2e8f0', transition: 'all 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editedTask.post_reprovado ? '1rem' : '0' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: editedTask.post_reprovado ? '#be123c' : '#1e293b' }}>Post Reprovado / Cancelado</span>
                                                    <span style={{ fontSize: '0.75rem', color: editedTask.post_reprovado ? '#e11d48' : '#64748b' }}>Marcar se o material foi descartado</span>
                                                </div>
                                                <div 
                                                    className={`toggle-switch-premium ${editedTask.post_reprovado ? 'on' : ''}`} 
                                                    onClick={() => {
                                                        const newVal = !editedTask.post_reprovado;
                                                        handleFieldChange('post_reprovado', newVal);
                                                        if (newVal) handleFieldChange('post_aprovado', false);
                                                    }}
                                                    style={{ background: editedTask.post_reprovado ? '#e11d48' : undefined }}
                                                >
                                                    <div className="toggle-knob-premium"></div>
                                                </div>
                                            </div>
                                            {editedTask.post_reprovado && (
                                                <div className="nova-pauta-field-premium">
                                                    <label className="field-label-premium" style={{ color: '#be123c' }}>MOTIVO DO CANCELAMENTO</label>
                                                    <textarea
                                                        className="input-premium-textarea"
                                                        rows={2}
                                                        placeholder="Por que este post foi reprovado ou cancelado?"
                                                        value={editedTask.post_reprovado_comentario || ''}
                                                        onChange={e => handleFieldChange('post_reprovado_comentario', e.target.value)}
                                                        style={{ fontSize: '0.85rem', borderColor: '#fda4af' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-section-group-premium" style={{ marginTop: '1.5rem' }}>
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">📦</span>
                                        <h3>Material Solicitado</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                        {[
                                            { id: 'release', label: 'Release' },
                                            { id: 'post', label: 'Post' },
                                            { id: 'video', label: 'Vídeo' },
                                            { id: 'foto', label: 'Foto' },
                                            { id: 'arte', label: 'Arte' },
                                            { id: 'inauguracao', label: 'Inauguração' }
                                        ].map(mat => {
                                            const typeId = mat.id as TaskType;
                                            const isActive = editedTask.type.includes(typeId);
                                            return (
                                                <button 
                                                    key={mat.id}
                                                    type="button" 
                                                    onClick={() => {
                                                        const newTypes = isActive 
                                                            ? editedTask.type.filter(t => t !== typeId)
                                                            : [...editedTask.type, typeId];
                                                        
                                                        // Garantir que sempre haja pelo menos um tipo (fallback para 'release')
                                                        const finalTypes = newTypes.length > 0 ? newTypes : ['release'];
                                                        
                                                        // Atualizar o estado global da pauta
                                                        handleFieldChange('type', finalTypes);

                                                        // Atualizar o espelho post_material_solicitado para consistência de dados
                                                        const mirrorLabels = finalTypes.map(t => {
                                                            if (t === 'video') return 'Vídeo';
                                                            if (t === 'foto') return 'Foto';
                                                            return t.charAt(0).toUpperCase() + t.slice(1);
                                                        });
                                                        handleFieldChange('post_material_solicitado', mirrorLabels);
                                                    }}
                                                    className={`prio-pill-premium ${isActive ? 'active' : ''}`}
                                                    style={{ 
                                                        padding: '1rem', 
                                                        fontSize: '1rem', 
                                                        fontWeight: 700,
                                                        display: 'flex',
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        background: isActive ? '#1e293b' : 'white',
                                                        color: isActive ? 'white' : '#475569',
                                                        border: '1.5px solid',
                                                        borderColor: isActive ? '#1e293b' : '#e2e8f0',
                                                        boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {mat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: '1rem' }}>
                                        <button type="button" className="btn-edit-premium" style={{ borderRadius: '20px', padding: '0.5rem 1rem', width: 'auto' }}>
                                            <Plus size={14} /> Novo Formato
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                        💡 Selecione os formatos previstos para esta estratégia de post.
                                    </p>
                                </div>
                            </div>
                            
                            <section className="modal-section-group-premium">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão do Post</h3>
                                {renderCommentsByTab('post')}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="modal-body">
                        <div className="modal-main-col-premium" style={{ gap: "0" }}>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">🎬</span>
                                    <h3>Planejamento de Vídeo</h3>
                                </div>
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">Resumo da Pauta / Briefing de Vídeo</label>
                                    <textarea
                                        className="input-premium-textarea"
                                        rows={6}
                                        placeholder="Objetivo do vídeo, roteiro básico..."
                                        value={editedTask.video_briefing || ''}
                                        onChange={e => handleFieldChange('video_briefing', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-section-group-premium alternate-bg-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">02</span>
                                    <h3>Equipe e Prazos (Vídeo)</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div className="detail-item-premium">
                                        <label className="detail-label-premium">Captação (Imagens)</label>
                                        <TeamMultiSelect
                                            selected={editedTask.video_captacao_equipe || []}
                                            onChange={val => handleFieldChange('video_captacao_equipe', val)}
                                        />
                                    </div>
                                    <div className="detail-item-premium">
                                        <label className="detail-label-premium">Data Captação</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={editedTask.video_captacao_data ? new Date(editedTask.video_captacao_data).toISOString().split('T')[0] : ''}
                                            onChange={e => handleFieldChange('video_captacao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                        />
                                    </div>
                                </div>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
                                    <div className="detail-item-premium">
                                        <label className="detail-label-premium">Edição / Finalização</label>
                                        <TeamMultiSelect
                                            selected={editedTask.video_edicao_equipe || []}
                                            onChange={val => handleFieldChange('video_edicao_equipe', val)}
                                        />
                                    </div>
                                    <div className="detail-item-premium">
                                        <label className="detail-label-premium">Previsão de Edição</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={editedTask.video_edicao_data ? new Date(editedTask.video_edicao_data).toISOString().split('T')[0] : ''}
                                            onChange={e => handleFieldChange('video_edicao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">03</span>
                                    <h3>O que precisa ser feito?</h3>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                    {[
                                        { id: 'cobertura', label: 'Cobertura (Imagens)' },
                                        { id: 'depoimentos', label: 'Depoimentos' },
                                        { id: 'drone', label: 'Imagens Aéreas (Drone)' }
                                    ].map(item => (
                                        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                            <input
                                                type="checkbox"
                                                checked={(editedTask.video_necessidades || []).includes(item.id)}
                                                onChange={e => {
                                                    const current = editedTask.video_necessidades || [];
                                                    if (e.target.checked) handleFieldChange('video_necessidades', [...current, item.id]);
                                                    else handleFieldChange('video_necessidades', current.filter(x => x !== item.id));
                                                }}
                                                style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                                            />
                                            {item.label}
                                        </label>
                                    ))}
                                </div>
                                {(editedTask.video_necessidades || []).includes('depoimentos') && (
                                    <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>💡 AVISO:</span>
                                        Não esqueça de levar o microfone!
                                    </div>
                                )}
                            </div>

                            <div className="modal-section-group-premium alternate-bg-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">🎬</span>
                                    <h3>Controle de Entrega</h3>
                                </div>
                                <div style={{ maxWidth: '300px' }}>
                                    <div className="detail-item-premium">
                                        <label className="detail-label-premium">Prazo Máximo de Entrega</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={editedTask.video_entrega_data ? new Date(editedTask.video_entrega_data).toISOString().split('T')[0] : ''}
                                            onChange={e => handleFieldChange('video_entrega_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Comentários da Aba */}
                            <section className="modal-section-group-premium">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Vídeo)</h3>
                                {renderCommentsByTab('video')}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'foto' && (
                    <div className="modal-body">
                        <div className="modal-main-col-premium" style={{ gap: "0" }}>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">📸</span>
                                    <h3>Produção de Fotografia</h3>
                                </div>
                                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Os campos dedicados para produção de Fotos serão construídos aqui em breve.</p>
                            </div>
                            
                            <section className="modal-section-group-premium">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Fotografia</h3>
                                {renderCommentsByTab('foto')}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'arte' && (
                    <div className="modal-body">
                        <div className="modal-main-col-premium" style={{ gap: "0" }}>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">🎨</span>
                                    <h3>Pedido de Arte</h3>
                                </div>
                                
                                <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                    <label className="field-label-premium">TIPO DE PEÇAS</label>
                                    <textarea
                                        className="input-premium-textarea"
                                        rows={4}
                                        placeholder="Descreva as peças necessárias (ex: Banner 120x80, Arte para Instagram, Card de convite...)"
                                        value={editedTask.arte_tipo_pecas || ''}
                                        onChange={e => handleFieldChange('arte_tipo_pecas', e.target.value)}
                                    />
                                </div>

                                <div className="fields-grid-2-premium">
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">PRAZO DE ENTREGA</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={editedTask.arte_entrega_data ? new Date(editedTask.arte_entrega_data).toISOString().split('T')[0] : ''}
                                            onChange={e => handleFieldChange('arte_entrega_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">ANEXOS / REFERÊNCIAS</label>
                                        <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Utilize a seção de anexos abaixo para gerenciar as imagens desta arte.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <section className="modal-section-group-premium">
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Arte</h3>
                                {renderCommentsByTab('arte')}
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === 'inauguracao' && (
                    <div className="modal-body" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏛️</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Aba de Inauguração</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Os campos específicos de inauguração serão migrados para cá em breve.</p>
                        </div>
                    </div>
                )}
            </div>

            {viewingFile && (
                <FileViewer
                    attachment={viewingFile}
                    onClose={() => setViewingFile(null)}
                />
            )}
        </div>
    );
}
