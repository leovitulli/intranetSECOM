import React, { useState, useEffect } from 'react';
import type { Task, Comment } from '../types/kanban';
import { X, Send, Paperclip, FileText, Image as ImageIcon, Video, File, Activity, Archive, MapPin, Award, Building2, CheckSquare, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import FileViewer from './FileViewer';
import type { Attachment } from '../types/kanban';
import { useData } from '../contexts/DataContext';
import './TaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => void;
    onArchive?: () => void;
}

export default function TaskModal({ task, onClose, onUpdateTask, onArchive }: TaskModalProps) {
    const { user } = useAuth();
    const { team, archiveTask } = useData();
    const [newComment, setNewComment] = useState('');
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Editable states
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleContent, setEditTitleContent] = useState(task.title);

    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescContent, setEditDescContent] = useState(task.description);

    const [newAssigneeName, setNewAssigneeName] = useState('');
    const [activityLogs, setActivityLogs] = useState<any[]>([]);

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
                    (payload) => {
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

        onUpdateTask({
            ...task,
            comments: [...task.comments, comment]
        });
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

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: Attachment[] = [];
        Array.from(files).forEach((file) => {
            let fileType = 'file';
            if (file.type.startsWith('image/')) fileType = 'image';
            if (file.type.startsWith('video/')) fileType = 'video';
            if (file.type === 'application/pdf') fileType = 'pdf';

            const reader = new FileReader();
            reader.onload = (event) => {
                const url = event.target?.result as string;
                newAttachments.push({
                    id: Date.now().toString() + Math.random(),
                    name: file.name,
                    size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
                    type: fileType as any,
                    url: url
                });

                // If this is the last file, update the state
                if (newAttachments.length === files.length) {
                    onUpdateTask({
                        ...task,
                        attachments: [...task.attachments, ...newAttachments]
                    });
                }
            };
            reader.readAsDataURL(file);
        });

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- Inauguration data fallback: parse from description for old cards ---
    const isInauguracao = task.status === 'inauguracao';
    const parseInaugField = (field: string): string | null => {
        if (!task.description) return null;
        const regex = new RegExp(`\\*\\*${field}:\\*\\* (.+)`);
        const match = task.description.match(regex);
        return match ? match[1].trim() : null;
    };
    const inaugNome = task.inauguracao_nome || (isInauguracao ? parseInaugField('Nome') : null);
    const inaugEndereco = task.inauguracao_endereco || (isInauguracao ? parseInaugField('Endereço') : null);
    const inaugSecretariasStr = task.inauguracao_secretarias?.join(', ') || (isInauguracao ? parseInaugField('Secretarias') : null);
    const inaugTipo = task.inauguracao_tipo || (isInauguracao ? parseInaugField('Tipo') : null);
    const inaugData = task.inauguracao_data
        ? format(task.inauguracao_data, "dd/MM/yyyy", { locale: ptBR })
        : (isInauguracao ? parseInaugField('Data') : null);

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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <div className="modal-badges">
                        <div className="task-badges-container">
                            {task.type.map(t => (
                                <span key={t} className={`badge type-${t}`}>
                                    {t === 'release' && '📝 Release'}
                                    {t === 'arte' && '🎨 Arte Gráfica'}
                                    {t === 'video' && '🎬 Vídeo'}
                                    {t === 'foto' && '📸 Fotos'}
                                    {t === 'inauguracao' && 'Inauguração'}
                                </span>
                            ))}
                        </div>

                        <div className="priority-selector">
                            <select
                                className={`badge priority-${task.priority}`}
                                value={task.priority}
                                onChange={(e) => onUpdateTask({ ...task, priority: e.target.value as any })}
                            >
                                <option value="baixa">Prioridade: Baixa</option>
                                <option value="media">Prioridade: Média</option>
                                <option value="alta">Prioridade: Alta</option>
                            </select>
                        </div>

                        <span className={`badge status-${task.status}`}>
                            Status: {task.status.toUpperCase()}
                        </span>

                        <button
                            title="Arquivar pauta"
                            onClick={async () => {
                                if (confirm('Arquivar esta pauta? Ela ficará visível na aba de Histórico.')) {
                                    await archiveTask(task.id);
                                    if (onArchive) onArchive();
                                    onClose();
                                }
                            }}
                            style={{ background: 'none', border: '1px solid hsl(var(--color-border))', borderRadius: 'var(--radius-md)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: 'hsl(var(--color-text-muted))', fontSize: '0.8rem' }}
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
                                    if (editTitleContent.trim() && editTitleContent !== task.title) {
                                        onUpdateTask({ ...task, title: editTitleContent.trim() });
                                    } else {
                                        setEditTitleContent(task.title);
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
                            {task.title}
                        </h2>
                    )}
                </div>

                <div className="modal-body">
                    <div className="modal-main-col">
                        <div className="modal-section">
                            <div className="section-header">
                                <h3>Descrição</h3>
                                {!isEditingDesc && !isAutoInaugDesc && (
                                    <button className="btn-secondary small" onClick={() => setIsEditingDesc(true)}>Editar</button>
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
                                            setEditDescContent(task.description);
                                        }}>Cancelar</button>
                                        <button className="btn-primary small" onClick={() => {
                                            onUpdateTask({ ...task, description: editDescContent });
                                            setIsEditingDesc(false);
                                        }}>Salvar</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="task-description">{task.description}</p>
                            )}
                        </div>

                        {/* Inauguration-specific section */}
                        {task.status === 'inauguracao' && (
                            <div className="modal-section" style={{
                                background: 'hsla(330, 60%, 97%, 1)',
                                border: '1px solid hsla(330, 40%, 85%, 1)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1.25rem'
                            }}>
                                <h3 style={{ color: 'hsl(330, 50%, 40%)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    Dados da Inauguração
                                </h3>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
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
                                                selected={task.inauguracao_secretarias || []}
                                                onChange={(newSecs) => {
                                                    onUpdateTask({ ...task, inauguracao_secretarias: newSecs });
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
                                                            onUpdateTask({ ...task, inauguracao_checklist: updated });
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

                        <div className="modal-section attachments-section">
                            <div className="section-header">
                                <h3>Anexos ({task.attachments.length})</h3>
                                <input
                                    type="file"
                                    multiple
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                                <button className="btn-secondary small" onClick={() => fileInputRef.current?.click()}>
                                    <Paperclip size={14} /> Adicionar
                                </button>
                            </div>

                            {task.attachments.length > 0 ? (
                                <div className="attachments-list">
                                    {task.attachments.map(att => (
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
                                <p className="empty-state">Nenhum anexo adicionado nesta pauta.</p>
                            )}
                        </div>

                        <div className="modal-section comments-section">
                            <h3>Comentários e Atualizações</h3>

                            <div className="comments-list">
                                {task.comments.length > 0 ? (
                                    task.comments.map(comment => (
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

                    <div className="modal-side-col">
                        <div className="side-card">
                            <h3>Detalhes</h3>

                            {/* Secretaria — full width */}
                            <div className="detail-item">
                                <span className="detail-label">Secretaria</span>
                                <SecretariasMultiSelect
                                    selected={
                                        isInauguracao
                                            ? (task.inauguracao_secretarias || (inaugSecretariasStr ? inaugSecretariasStr.split(',').map(s => s.trim()) : []))
                                            : (task.creator ? task.creator.split(',').map(s => s.trim()) : [])
                                    }
                                    onChange={(newSecs) => {
                                        if (isInauguracao) {
                                            onUpdateTask({ ...task, inauguracao_secretarias: newSecs });
                                        } else {
                                            onUpdateTask({ ...task, creator: newSecs.join(', ') });
                                        }
                                    }}
                                />
                            </div>

                            {/* Prazo — full width compact */}
                            <div className="detail-item">
                                <span className="detail-label">Prazo de Entrega</span>
                                <input
                                    type="date"
                                    className="edit-input-small"
                                    value={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ''}
                                    onChange={e => {
                                        const dateVal = e.target.value;
                                        if (dateVal) {
                                            const [year, month, day] = dateVal.split('-');
                                            onUpdateTask({ ...task, dueDate: new Date(parseInt(year), parseInt(month) - 1, parseInt(day)) });
                                        } else {
                                            onUpdateTask({ ...task, dueDate: null });
                                        }
                                    }}
                                />
                            </div>


                            {/* Row 2: Responsáveis — full width */}
                            <div className="detail-item">
                                <span className="detail-label">Responsáveis</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                                    {task.assignees && task.assignees.length > 0 ? (
                                        task.assignees.map(assignee => {
                                            const member = team.find(m => m.name === assignee);
                                            const avatarSrc = member?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assignee)}&background=random`;
                                            return (
                                                <div key={assignee} className="assignee-tag">
                                                    <img src={avatarSrc} alt={assignee} />
                                                    <span>{assignee}</span>
                                                    <button
                                                        className="remove-assignee"
                                                        onClick={() => {
                                                            onUpdateTask({
                                                                ...task,
                                                                assignees: task.assignees.filter(a => a !== assignee)
                                                            });
                                                        }}
                                                        title="Remover"
                                                    >
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <span className="unassigned-text">Ninguém atribuído</span>
                                    )}
                                </div>
                                <select
                                    value={newAssigneeName}
                                    onChange={async (e) => {
                                        const selectedId = e.target.value;
                                        const member = team.find(m => m.id === selectedId);
                                        if (member && !task.assignees.includes(member.name)) {
                                            onUpdateTask({
                                                ...task,
                                                assignees: [...task.assignees, member.name]
                                            });
                                            await supabase.from('notifications').insert({
                                                user_id: member.id,
                                                title: 'Nova Atribuição',
                                                message: `Você foi escalado(a) na pauta: "${task.title}"`,
                                                module: 'kanban'
                                            });
                                        }
                                        setNewAssigneeName('');
                                    }}
                                    className="edit-input-small"
                                    style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}
                                >
                                    <option value="" disabled>+ Adicionar responsável</option>
                                    {team.filter(m => !task.assignees.includes(m.name)).map(m => (
                                        <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Row 3: Tipos de Material — 2 cols */}
                            <div className="detail-item">
                                <span className="detail-label">Tipos de Material</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginTop: '0.4rem' }}>
                                    {(['release', 'arte', 'video', 'foto', 'inauguracao'] as const).map(typeKey => (
                                        <label key={typeKey} className="type-checkbox" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={task.type.includes(typeKey)}
                                                onChange={() => {
                                                    const newTypes = task.type.includes(typeKey)
                                                        ? task.type.filter(t => t !== typeKey)
                                                        : [...task.type, typeKey];
                                                    onUpdateTask({ ...task, type: newTypes.length > 0 ? newTypes : task.type });
                                                }}
                                            />
                                            {typeKey === 'release' && '📝 Texto'}
                                            {typeKey === 'arte' && '🎨 Arte'}
                                            {typeKey === 'video' && '🎬 Vídeo'}
                                            {typeKey === 'foto' && '📸 Fotos'}
                                            {typeKey === 'inauguracao' && 'Inauguração'}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>


                        <div className="side-actions">
                            <button className="action-btn" onClick={() => {
                                const newStatus = prompt('Digite o novo status (solicitado, andamento, aprovacao, publicado):');
                                if (newStatus && ['solicitado', 'andamento', 'aprovacao', 'publicado'].includes(newStatus.toLowerCase())) {
                                    onUpdateTask({ ...task, status: newStatus.toLowerCase() as any });
                                }
                            }}>Mover Cartão</button>
                            {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                                <button
                                    className="action-btn danger"
                                    onClick={() => {
                                        if (confirm('Tem certeza que deseja arquivar esta pauta? Ela sairá do Painel Kanban.')) {
                                            onUpdateTask({ ...task, status: 'arquivado' as any });
                                            onClose();
                                        }
                                    }}
                                >Arquivar Pauta</button>
                            )}
                        </div>
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
