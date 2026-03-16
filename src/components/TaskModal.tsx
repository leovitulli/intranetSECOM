import React, { useState, useEffect } from 'react';
import type { Task, Comment } from '../types/kanban';
import { X, Send, Paperclip, FileText, Image as ImageIcon, Video, File, Activity, Archive, MapPin, Award, Building2, CheckSquare, Calendar, RotateCcw } from 'lucide-react';
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
            date: new Date()
        };

        // Instantly save comments
        onUpdateTask({
            ...task,
            comments: [...task.comments, comment]
        });
        setEditedTask(prev => ({ ...prev, comments: [...prev.comments, comment] }));
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
                const { error } = await supabase.storage
                    .from('task-attachments')
                    .upload(path, file, { upsert: false });

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

    return (
        <div className="modal-overlay">
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <div className="modal-header-actions">
                        <div className="task-badges-container">
                            {editedTask.type.map(t => {
                                if (t === 'inauguracao') return null;
                                return (
                                    <span key={t} className={`badge-tag badge-${t}`}>
                                        {t === 'release' && '📝 Release'}
                                        {t === 'post' && '📱 Post'}
                                        {t === 'arte' && '🎨 Arte Gráfica'}
                                        {t === 'video' && '🎬 Vídeo'}
                                        {t === 'foto' && '📸 Fotos'}
                                    </span>
                                );
                            })}
                        </div>

                        <div className="priority-selector">
                            <select
                                className={`priority-select priority-${editedTask.priority}`}
                                value={editedTask.priority}
                                onChange={(e) => handleFieldChange('priority', e.target.value as any)}
                            >
                                <option value="baixa">Prioridade: Baixa</option>
                                <option value="media">Prioridade: Média</option>
                                <option value="alta">Prioridade: Alta</option>
                            </select>
                        </div>

                        <div className="status-indicator">
                            <span className="label">Status:</span>
                            <span className="value">{editedTask.status.toUpperCase()}</span>
                        </div>

                        <button
                            className="btn-archive-header"
                            onClick={async () => {
                                if (confirm('Arquivar esta pauta? Ela ficará visível na aba de Histórico.')) {
                                    await archiveTask(task.id);
                                    if (onArchive) onArchive();
                                    onClose();
                                }
                            }}
                        >
                            <Archive size={14} /> Arquivar
                        </button>
                    </div>
                    {isEditingTitle ? (
                        <div className="edit-title-form" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' }}>
                            <input
                                type="text"
                                className="edit-textarea"
                                style={{ flex: 1, fontSize: '1.5rem', fontWeight: 700 }}
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
                                onKeyDown={e => {
                                    if (e.key === 'Enter') e.currentTarget.blur();
                                }}
                                autoFocus
                            />
                        </div>
                    ) : (
                        <h2 className="modal-title" onClick={() => setIsEditingTitle(true)} style={{ cursor: 'pointer', outline: 'none' }} title="Clique para editar">
                            {editedTask.title}
                        </h2>
                    )}
                </div>

                <div className="modal-body">
                    <div className="modal-main-col-premium">
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">01</span>
                                <h3>Descrição</h3>
                                {!isEditingDesc && !isAutoInaugDesc && (
                                    <button className="btn-edit-premium" onClick={() => setIsEditingDesc(true)}>Editar</button>
                                )}
                            </div>

                            {isAutoInaugDesc ? (
                                <p className="empty-state">Os detalhes desta inauguração estão na seção abaixo.</p>
                            ) : isEditingDesc ? (
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
                                <p className="task-description">{editedTask.description}</p>
                            )}
                        </div>

                        {/* Inauguration-specific section */}
                        {task.status === 'inauguracao' && (
                            <div className="modal-section-group-premium inuag-premium-bg">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">02</span>
                                    <h3>Dados da Inauguração</h3>
                                    {!isEditingInaug && (
                                        <button className="btn-edit-premium" onClick={() => setIsEditingInaug(true)}>Editar</button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
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
                            <div className="section-header-premium">
                                <span className="section-number-premium">03</span>
                                <h3>Anexos ({task.attachments.length})</h3>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <button className="btn-edit-premium" onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachments}>
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
                                        >
                                            {getFileIcon(att.type)}
                                            <div className="att-info">
                                                <span className="att-name">{att.name}</span>
                                                <span className="att-size">{att.size}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="empty-state">Nenhum anexo adicionado.</p>
                            )}
                        </div>

                        <div className="modal-section-group-premium alternate-bg-premium">
                            <h3>Comentários e Atualizações</h3>

                            <div className="comments-list">
                                {editedTask.comments.length > 0 ? (
                                    editedTask.comments.map(comment => (
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
                                    <p className="empty-state">Nenhum comentário ainda. Seja o primeiro a interagir!</p>
                                )}
                            </div>

                            <form onSubmit={handleAddComment} className="comment-input-area">
                                <img src={user?.avatar} alt="You" className="comment-avatar" />
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        placeholder="Escreva um comentário ou atualização..."
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                    />
                                    <button type="submit" disabled={!newComment.trim()}>
                                        <Send size={18} />
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="modal-section activity-section" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                                <Activity size={16} />
                                <h3>Histórico de Atividades</h3>
                            </div>
                            <div className="activity-list" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                background: 'hsl(var(--color-background) / 0.5)',
                                border: '1px solid hsl(var(--color-border))',
                                borderRadius: 'var(--radius-md)',
                                padding: '0.75rem'
                            }}>
                                {activityLogs.length > 0 ? (
                                    activityLogs.map(log => (
                                        <div key={log.id} className="activity-item" style={{ fontSize: '0.82rem', display: 'flex', gap: '8px', flexWrap: 'wrap', paddingBottom: '6px', borderBottom: '1px solid hsl(var(--color-border) / 0.5)' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{log.user_name}</span>
                                            <span style={{ color: 'var(--color-text)', flex: 1 }}>{log.details}</span>
                                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                                                {format(new Date(log.created_at), "d/MM HH:mm", { locale: ptBR })}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-state text-muted" style={{ fontSize: '0.85rem' }}>Nenhum histórico registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-side-col-premium">
                        <div className="side-section-premium">
                            <h3 className="side-title-premium">Detalhes da Cobertura</h3>

                            {/* Secretaria */}
                            <div className="detail-item-premium">
                                <label className="detail-label-premium">Departamentos / Secretarias</label>
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
                                    <label className="detail-label-premium">Data da Pauta</label>
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
                                <label className="detail-label-premium">Horário da Cobertura</label>
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
                                <label className="detail-label-premium">Endereço</label>
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
                                <label className="detail-label-premium">Tipos de Material</label>
                                <div className="material-pills-premium side">
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
                            <h3 className="side-title-premium">Ações</h3>
                            <div className="side-footer-actions-premium">
                                <button className="btn-side-action-premium" onClick={() => {
                                    const newStatus = prompt('Digite o novo status (solicitado, andamento, aprovacao, publicado):');
                                    if (newStatus && ['solicitado', 'andamento', 'aprovacao', 'publicado'].includes(newStatus.toLowerCase())) {
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
