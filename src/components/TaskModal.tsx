import React, { useState, useEffect } from 'react';
import type { Task, Comment, TaskType } from '../types/kanban';
import { X, Send, Paperclip, FileText, Image as ImageIcon, Video, File, Activity, Archive, MapPin, Award, Building2, CheckSquare, Calendar, RotateCcw, Trash2, Plus } from 'lucide-react';
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
    const { archiveTask, unarchiveTask, tasks, deleteTask } = useData();
    const uniqueAddresses = Array.from(new Set(tasks?.map((t: Task) => t.pauta_endereco).filter(Boolean)));
    const [newComment, setNewComment] = useState('');
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const [uploadingAttachments, setUploadingAttachments] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Buffer edits locally
    const [editedTask, setEditedTask] = useState<Task>(task);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'release' | 'post' | 'video' | 'foto' | 'arte' | 'inauguracao'>('geral');

    useEffect(() => {
        setEditedTask(task);
        setEditTitleContent(task.title);
        setEditDescContent(task.description);
        setHasUnsavedChanges(false);
    }, [task]);

    // Editable states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleContent, setEditTitleContent] = useState(task.title);

    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescContent, setEditDescContent] = useState(task.description);

    const [isEditingInaug, setIsEditingInaug] = useState(false);

    const [activityLogs, setActivityLogs] = useState<any[]>([]);

    const handleTypeToggleInModal = (typeKey: any) => {
        const newTypes = editedTask.type.includes(typeKey)
            ? editedTask.type.filter(t => t !== typeKey)
            : [...editedTask.type, typeKey];
        handleFieldChange('type', newTypes.length > 0 ? newTypes : editedTask.type);
    };

    const handleFieldChange = (field: keyof Task, value: any) => {
        setEditedTask(prev => ({ ...prev, [field]: value }));
        setHasUnsavedChanges(true);
    };

    const handleSave = async () => {
        await onUpdateTask(editedTask);
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

    // --- Inauguration data fallback: parse from description for old cards ---
    const isInauguracao = task.status === 'inauguracao';
    const parseInaugField = (field: string): string | null => {
        if (!task.description) return null;
        const regex = new RegExp(`\\*\\*${field}:\\*\\* (.+)`);
        const match = task.description.match(regex);
        return match ? match[1].trim() : null;
    };
    const inaugNome = editedTask.inauguracao_nome || (isInauguracao ? parseInaugField('Nome') : null);
    const inaugEndereco = editedTask.inauguracao_endereco || (isInauguracao ? parseInaugField('Endereço') : null);

    const inaugTipo = editedTask.inauguracao_tipo || (isInauguracao ? parseInaugField('Tipo') : null);
    const inaugData = editedTask.inauguracao_data
        ? format(editedTask.inauguracao_data, "dd/MM/yyyy", { locale: ptBR })
        : (isInauguracao ? parseInaugField('Data') : null);

    // --- Pauta data ---
    const pautaDataStr = editedTask.pauta_data ? format(new Date(editedTask.pauta_data + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR }) : null;
    const pautaHorario = editedTask.pauta_horario;
    const pautaEndereco = editedTask.pauta_endereco;

    // Fallback checklist for old cards that have tipo but no saved checklist
    const DEFAULT_CHECKLIST_SIMPLES = [
        { id: 'placa', label: 'Placa de inauguração', done: false },
        { id: 'backdrop', label: 'Backdrop', done: false },
    ];
    const DEFAULT_CHECKLIST_MASTER = [
        { id: 'placa', label: 'Placa de inauguração', done: false },
        { id: 'backdrops', label: 'Backdrops / banners', done: false },
        { id: 'telao', label: '1 Telão', done: false },
        { id: 'video_telao', label: 'Vídeo para telão', done: false },
    ];
    const effectiveChecklist = task.inauguracao_checklist && task.inauguracao_checklist.length > 0
        ? task.inauguracao_checklist
        : isInauguracao
            ? (inaugTipo === 'master' || inaugTipo === 'Inauguração Master' ? DEFAULT_CHECKLIST_MASTER : DEFAULT_CHECKLIST_SIMPLES)
            : null;
    // The creator to display in side panel
    // Whether the description is the auto-generated inauguration markdown (hide it)
    const isAutoInaugDesc = isInauguracao && task.description?.startsWith('**Nome:**');

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
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className="section-number-premium">01</span>
                                    <h3>Descrição</h3>
                                </div>
                                {!isEditingDesc && !isAutoInaugDesc && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingDesc(true)}>Editar</button>
                                )}
                            </div>

                            { isEditingDesc ? (
                                <div className="edit-desc-form">
                                    <textarea
                                        rows={4}
                                        value={editDescContent}
                                        onChange={e => setEditDescContent(e.target.value)}
                                        className="edit-textarea"
                                    />
                                    <div className="edit-actions">
                                        <button className="btn-secondary small" onClick={() => {
                                            setIsEditingDesc(false);
                                            setEditDescContent(editedTask.description);
                                        }}>Cancelar</button>
                                        <button className="btn-primary small" onClick={() => {
                                            handleFieldChange('description', editDescContent);
                                            setIsEditingDesc(false);
                                        }}>Concluir Edição</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="task-description" style={{ fontSize: "0.95rem", color: "#475569" }}>{editedTask.description}</p>
                            )}
                        </div>

                        {/* Inauguration-specific section */}
                        {true && (
                            <div className="modal-section-group-premium ">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">02</span>
                                    <h3>Dados da Cobertura</h3>
                                    {!isEditingInaug && (
                                        <button className="btn-edit-premium" onClick={() => setIsEditingInaug(true)}>Editar</button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '0' }}>
                                    {isEditingInaug ? (
                                        <div className="inaug-edit-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div className="form-group-premium">
                                                <label><Award size={14} /> Nome da Inauguração</label>
                                                <input
                                                    type="text"
                                                    className="input-premium"
                                                    value={editedTask.inauguracao_nome || ''}
                                                    onChange={e => handleFieldChange('inauguracao_nome', e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group-premium">
                                                <label><MapPin size={14} /> Endereço</label>
                                                <input
                                                    type="text"
                                                    className="input-premium"
                                                    value={editedTask.inauguracao_endereco || ''}
                                                    onChange={e => handleFieldChange('inauguracao_endereco', e.target.value)}
                                                />
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div className="form-group-premium">
                                                    <label><Activity size={14} /> Tipo</label>
                                                    <select
                                                        className="select-premium"
                                                        value={editedTask.inauguracao_tipo || 'simples'}
                                                        onChange={e => handleFieldChange('inauguracao_tipo', e.target.value)}
                                                    >
                                                        <option value="simples">Simples</option>
                                                        <option value="master">Master</option>
                                                    </select>
                                                </div>
                                                <div className="form-group-premium">
                                                    <label><Calendar size={14} /> Data</label>
                                                    <input
                                                        type="date"
                                                        className="input-premium"
                                                        value={editedTask.inauguracao_data ? new Date(editedTask.inauguracao_data).toISOString().split('T')[0] : ''}
                                                        onChange={e => handleFieldChange('inauguracao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)}
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                className="btn-primary small" 
                                                style={{ alignSelf: 'flex-end', marginTop: '0.5rem' }}
                                                onClick={() => setIsEditingInaug(false)}
                                            >
                                                Confirmar Edição
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {inaugNome && (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <Award size={15} style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginTop: 2 }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(330, 40%, 55%)', letterSpacing: '0.05em' }}>Nome</div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{inaugNome}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {inaugEndereco && (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <MapPin size={15} style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginTop: 2 }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(330, 40%, 55%)', letterSpacing: '0.05em' }}>Endereço</div>
                                                        <div style={{ fontSize: '0.9rem' }}>{inaugEndereco}</div>
                                                    </div>
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                <Building2 size={15} style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginTop: 6 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(330, 40%, 55%)', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Secretaria(s)</div>
                                                    <SecretariasMultiSelect
                                                        selected={editedTask.inauguracao_secretarias || []}
                                                        onChange={(newSecs) => {
                                                            handleFieldChange('inauguracao_secretarias', newSecs);
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            {inaugTipo && (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <Award size={15} style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginTop: 2 }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(330, 40%, 55%)', letterSpacing: '0.05em' }}>Tipo</div>
                                                        <div style={{ fontSize: '0.9rem' }}>{inaugTipo}</div>
                                                    </div>
                                                </div>
                                            )}
                                            {inaugData && (
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                                    <Calendar size={15} style={{ color: 'hsl(330, 50%, 50%)', flexShrink: 0, marginTop: 2 }} />
                                                    <div>
                                                        <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'hsl(330, 40%, 55%)', letterSpacing: '0.05em' }}>Data da Inauguração</div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'hsl(330, 55%, 40%)' }}>{inaugData}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Checklist */}
                                {effectiveChecklist && effectiveChecklist.length > 0 && (
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', fontSize: '0.85rem', fontWeight: 700, color: 'hsl(330, 50%, 40%)' }}>
                                            <CheckSquare size={15} />
                                            Checklist de Materiais
                                            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--color-text-muted))' }}>
                                                {effectiveChecklist.filter(i => i.done).length}/{effectiveChecklist.length} concluídos
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {effectiveChecklist.map(item => (
                                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', padding: '4px 0' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={item.done}
                                                        style={{ accentColor: 'hsl(330, 60%, 50%)', width: 16, height: 16 }}
                                                        onChange={() => {
                                                            const updated = effectiveChecklist.map(i =>
                                                                i.id === item.id ? { ...i, done: !i.done } : i
                                                            );
                                                            handleFieldChange('inauguracao_checklist', updated);
                                                        }}
                                                    />
                                                    <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'hsl(var(--color-text-muted))' : 'inherit' }}>
                                                        {item.label}
                                                    </span>
                                                    {item.done && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'hsl(140, 60%, 40%)' }}>✅ Pronto</span>}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Pauta-specific section (Non-inauguration) */}
                        {!isInauguracao && (editedTask.pauta_data || editedTask.pauta_horario || editedTask.pauta_endereco) && (
                            <div className="modal-section-group-premium alternate-bg-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">02</span>
                                    <h3>Dados da Cobertura</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                    {pautaDataStr && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Data</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pautaDataStr}</div>
                                        </div>
                                    )}
                                    {pautaHorario && (
                                        <div>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Horário</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{pautaHorario}</div>
                                        </div>
                                    )}
                                </div>
                                {pautaEndereco && (
                                    <div style={{ marginTop: '1rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>Endereço</div>
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pautaEndereco)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ fontSize: '0.7rem', color: 'hsl(var(--color-primary))', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <MapPin size={12} /> Ver no Google Maps
                                            </a>
                                        </div>
                                        <div style={{ fontSize: '0.9rem' }}>{pautaEndereco}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="modal-section-group-premium">
                            <div className="section-header-premium" style={{ justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span className="section-number-premium">03</span>
                                    <h3>Anexos ({task.attachments.length})</h3>
                                </div>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <button className="btn-edit-premium" style={{ gap: '6px' }} onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachments}>
                                    {uploadingAttachments ? (
                                        <><span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: 'inherit', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Enviando...</>
                                    ) : (
                                        <><Paperclip size={14} /> Adicionar</>
                                    )}
                                </button>
                            </div>

                            {uploadingAttachments && (
                                <div style={{ fontSize: '0.8rem', color: 'hsl(var(--color-primary))', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    Gravando arquivo no servidor...
                                </div>
                            )}

                            {(editedTask.attachments || []).length > 0 ? (
                                <div className="attachments-list">
                                    {editedTask.attachments.map(att => (
                                        <div
                                            key={att.id}
                                            className="attachment-item clickable"
                                            onClick={() => setViewingFile(att)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {getFileIcon(att.type)}
                                                <div className="att-info">
                                                    <span className="att-name">{att.name}</span>
                                                    <span className="att-size">{att.size}</span>
                                                </div>
                                            </div>
                                            <button 
                                                className="icon-btn-small" 
                                                onClick={(e) => handleRemoveAttachment(e, att)}
                                                style={{ color: 'var(--color-danger)', opacity: 0.7 }}
                                                title="Excluir Anexo"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">Nenhum anexo adicionado.</p>
                            )}
                        </div>

                        <div className="modal-section-group-premium alternate-bg-premium">
                            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e293b' }}>Discussão Geral</h3>
                            {renderCommentsByTab('geral')}
                        </div>

                    </div>

                    <div className="modal-side-col-premium" style={{ borderLeft: "1px solid #e2e8f0", padding: "2rem 1.5rem" }}>
                        <div className="side-section-premium">
                            <h3 className="side-title-premium">Detalhes da Cobertura</h3>

                            {/* Secretaria */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">DEPARTAMENTOS / SECRETARIAS</label>
                                <SecretariasMultiSelect
                                    selected={editedTask.inauguracao_secretarias || []}
                                    onChange={(newSecs) => handleFieldChange('inauguracao_secretarias', newSecs)}
                                />
                            </div>

                            {/* Responsável pela Pauta */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">Responsável pela Pauta</label>
                                <TeamMultiSelect
                                    selected={(editedTask.creator || '').split(',').map(s => s.trim()).filter(Boolean)}
                                    onChange={(newCreators) => handleFieldChange('creator', newCreators.join(', '))}
                                    placeholder="Selecione..."
                                />
                            </div>

                            {/* Pauta Externa Toggle */}
                            <div
                                className={`pauta-externa-side-toggle-premium ${editedTask.is_pauta_externa ? 'active' : ''}`}
                                onClick={() => handleFieldChange('is_pauta_externa', !editedTask.is_pauta_externa)}
                            >
                                <div className="toggle-info-premium">
                                    <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>Agenda Externa</span>
                                    <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>Visível na agenda geral</span>
                                </div>
                                <div className={`toggle-switch-premium mini ${editedTask.is_pauta_externa ? 'on' : ''}`}>
                                    <div className="toggle-knob-premium" />
                                </div>
                            </div>

                            {/* Equipe Externa */}
                            {editedTask.is_pauta_externa && (
                                <div className="detail-item-premium">
                                    <label className="detail-label-premium">Equipe Externa (Agenda)</label>
                                    <TeamMultiSelect
                                        selected={editedTask.assignees || []}
                                        onChange={(newAssignees) => handleFieldChange('assignees', newAssignees)}
                                    />
                                </div>
                            )}

                            {/* Data da Pauta */}
                            <div className="detail-item-premium">
                                <div className="label-with-hint-premium">
                                    <label className="detail-label-premium">DATA DA PAUTA</label>
                                    {editedTask.pauta_data && (
                                        <span className="side-day-hint-premium">
                                            {format(new Date(editedTask.pauta_data + 'T12:00:00'), "EEEE", { locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                                <input
                                    type="date"
                                    className="input-premium"
                                    value={editedTask.pauta_data || ''}
                                    onChange={e => handleFieldChange('pauta_data', e.target.value)}
                                />
                            </div>

                            {/* Horários */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">HORÁRIO DA COBERTURA</label>
                                <div className="time-range-group-premium">
                                    <input
                                        type="time"
                                        className="time-input-premium"
                                        value={(editedTask.pauta_horario || '').split(' às ')[0] || ''}
                                        onChange={e => {
                                            const end = (editedTask.pauta_horario || '').split(' às ')[1] || '';
                                            handleFieldChange('pauta_horario', end ? `${e.target.value} às ${end}` : e.target.value);
                                        }}
                                    />
                                    <span className="time-separator-premium">às</span>
                                    <input
                                        type="time"
                                        className="time-input-premium"
                                        value={(editedTask.pauta_horario || '').split(' às ')[1] || ''}
                                        onChange={e => {
                                            const start = (editedTask.pauta_horario || '').split(' às ')[0] || '';
                                            handleFieldChange('pauta_horario', start ? `${start} às ${e.target.value}` : e.target.value);
                                        }}
                                    />
                                </div>
                            </div>

                            {editedTask.is_pauta_externa && (
                                <div className="detail-item-premium">
                                    <label className="detail-label-premium">Saída do Paço</label>
                                    <input
                                        type="time"
                                        className="input-premium"
                                        value={editedTask.pauta_saida || ''}
                                        onChange={e => handleFieldChange('pauta_saida', e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Endereço */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">ENDEREÇO</label>
                                <div className="address-input-wrapper-premium">
                                    <input
                                        type="text"
                                        className="input-premium address-input-premium"
                                        placeholder="Endereço da pauta..."
                                        value={editedTask.pauta_endereco || ''}
                                        onChange={e => handleFieldChange('pauta_endereco', e.target.value)}
                                        list="enderecos-salvos-edit"
                                    />
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedTask.pauta_endereco || '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="maps-button-premium"
                                        title="Ver no Google Maps"
                                    >
                                        <MapPin size={16} />
                                    </a>
                                </div>
                                <datalist id="enderecos-salvos-edit">
                                    {(uniqueAddresses || []).map((addr, idx) => (
                                        <option key={idx} value={addr as string} />
                                    ))}
                                </datalist>
                            </div>

                            {/* Material */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">TIPOS DE MATERIAL</label>
                                <div className="material-pills-premium side" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    {[
                                        { id: 'release', label: 'Release' },
                                        { id: 'post', label: 'Post' },
                                        { id: 'video', label: 'Vídeo' },
                                        { id: 'foto', label: 'Foto' },
                                        { id: 'arte', label: 'Arte' },
                                        { id: 'inauguracao', label: 'Inauguração' }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            className={`material-pill-premium ${editedTask.type.includes(m.id as any) ? 'active' : ''}`}
                                            onClick={() => handleTypeToggleInModal(m.id)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="side-section-premium alternate">
                            <h3 className="side-title-premium" style={{ marginTop: "1rem" }}>AÇÕES</h3>
                            <div className="side-footer-actions-premium">
                                <button className="btn-side-action-premium" onClick={() => {
                                    const newStatus = prompt('Digite o novo status (solicitado, producao, correcao, aprovado, publicado, cancelado):');
                                    if (newStatus && ['solicitado', 'producao', 'correcao', 'aprovado', 'publicado', 'cancelado'].includes(newStatus.toLowerCase())) {
                                        handleFieldChange('status', newStatus.toLowerCase());
                                    }
                                }}>Mover Cartão</button>

                                {editedTask.archived ? (
                                    <button
                                        className="btn-side-action-premium"
                                        style={{ background: 'hsl(140, 50%, 95%)', color: 'hsl(140, 50%, 25%)', borderColor: 'hsl(140, 50%, 80%)' }}
                                        onClick={async () => {
                                            await unarchiveTask(task.id);
                                            onClose();
                                        }}
                                    >
                                        <RotateCcw size={16} /> Desarquivar Pauta
                                    </button>
                                ) : (
                                    <button
                                        className="btn-side-action-premium"
                                        onClick={async () => {
                                            if (confirm('Deseja arquivar esta pauta?')) {
                                                await archiveTask(task.id);
                                                onClose();
                                            }
                                        }}
                                    >
                                        <Archive size={16} /> Arquivar Pauta
                                    </button>
                                )}

                                {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                                    <>
                                        <button
                                            className="btn-side-action-premium danger"
                                            onClick={async () => {
                                                if (confirm('EXCLUSÃO DEFINITIVA: Tem certeza absoluta? Essa ação NÃO pode ser desfeita.')) {
                                                    await deleteTask(task.id);
                                                    onClose();
                                                }
                                            }}
                                        >Excluir Definitivamente</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Histórico de Atividades - Global na Lateral */}
                        <div className="side-section-premium" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: 'auto' }}>
                            <div className="side-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                <Activity size={14} /> HISTÓRICO
                            </div>
                            <div className="activity-list" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                maxHeight: '250px',
                                overflowY: 'auto',
                                paddingRight: '5px'
                            }}>
                                {activityLogs.length > 0 ? (
                                    activityLogs.map(log => (
                                        <div key={log.id} style={{ fontSize: '0.75rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '10px', paddingBottom: '2px' }}>
                                            <div style={{ fontWeight: 700, color: '#475569' }}>{log.user_name}</div>
                                            <div style={{ color: '#64748b', margin: '2px 0' }}>{log.details}</div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                                {format(new Date(log.created_at), "d/MM HH:mm", { locale: ptBR })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum registro.</p>
                                )}
                            </div>
                        </div>

                        {/* Save Actions Banner */}
                        {hasUnsavedChanges && (
                            <div className="save-banner-premium">
                                <span className="save-banner-text-premium">Alterações pendentes</span>
                                <div className="save-banner-buttons-premium">
                                    <button
                                        className="btn-save-banner-cancel-premium"
                                        onClick={() => {
                                            setEditedTask(task);
                                            setHasUnsavedChanges(false);
                                        }}
                                    >Descartar</button>
                                    <button
                                        className="btn-save-banner-confirm-premium"
                                        onClick={handleSave}
                                    >Salvar tudo</button>
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
