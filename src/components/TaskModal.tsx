import type { Task, TaskType } from '../types/kanban';
import {
    X, Send, Paperclip, FileText, Image as ImageIcon, Video,
    File, Activity, Archive, MapPin, Award, RotateCcw, Trash2, Plus, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FileViewer from './FileViewer';
import type { Attachment } from '../types/kanban';
import './TaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';
import TeamMultiSelect from './TeamMultiSelect';
import { useTaskModal } from '../hooks/useTaskModal';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

interface TaskModalProps {
    task: Task;
    onClose: () => void;
    onUpdateTask: (updatedTask: Task) => void;
    onArchive?: () => void;
}

// ─── Modal de Confirmação interno (substitui window.confirm / window.alert) ───
function ConfirmDialog({
    open, title, message, onConfirm, onCancel
}: {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!open) return null;
    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={onCancel}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'white', borderRadius: '20px',
                    padding: '2rem', maxWidth: '420px', width: '90%',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                    display: 'flex', flexDirection: 'column', gap: '1.25rem'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: '#fff7ed', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', color: '#ea580c', flexShrink: 0
                    }}>
                        <AlertTriangle size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>{title}</h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{message}</p>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >Cancelar</button>
                    <button
                        onClick={() => { onConfirm(); onCancel(); }}
                        style={{
                            padding: '8px 18px', borderRadius: '10px', border: 'none',
                            background: '#1e293b', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >Confirmar</button>
                </div>
            </div>
        </div>
    );
}

// ─── Ícone por tipo de arquivo ────────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
    switch (type) {
        case 'pdf':   return <FileText size={20} className="file-pdf" />;
        case 'image': return <ImageIcon size={20} className="file-image" />;
        case 'video': return <Video size={20} className="file-video" />;
        default:      return <File size={20} className="file-default" />;
    }
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TaskModal({ task, onClose, onUpdateTask, onArchive }: TaskModalProps) {
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const isViewer = useAuth().user?.role === 'viewer';

    const {
        user, editedTask, hasUnsavedChanges,
        activeTab, setActiveTab,
        newComment, setNewComment,
        uploadingAttachments, activityLogs,
        confirmDialog, closeConfirm, fileInputRef,
        isEditingTitle, setIsEditingTitle, editTitleContent, setEditTitleContent,
        isEditingDesc, setIsEditingDesc, editDescContent, setEditDescContent,
        isEditingAgendamento, setIsEditingAgendamento,
        isEditingEquipe, setIsEditingEquipe,
        isEditingExtras, setIsEditingExtras,
        handleFieldChange, handleSave, handleSaveSection,
        handleAddComment, handleFileUpload,
        handleRemoveAttachment, handleArchive, handleDelete, handleDiscard,
        getDayOfWeek, unarchiveTask,
    } = useTaskModal(task, onUpdateTask, onClose);

    // ── Renderizador de comentários por aba ───────────────────────────────────
    const renderCommentsByTab = (tabName?: string) => {
        const filtered = editedTask.comments.filter(c =>
            tabName === 'geral' ? (!c.tab || c.tab === 'geral') : c.tab === tabName
        );

        return (
            <>
                <div className="comments-list">
                    {filtered.length > 0 ? filtered.map(comment => (
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
                                <div className="comment-actions" style={{ marginLeft: 10, display: 'flex', gap: 5, opacity: 0.5, alignItems: 'center' }}>
                                    <button className="icon-btn-small" title="Excluir (em breve)" style={{ cursor: 'not-allowed' }}>
                                        <X size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', marginBottom: '1.5rem' }}>
                            Nenhum comentário nesta aba ainda.
                        </p>
                    )}
                </div>

                {!isViewer && (
                    <form onSubmit={handleAddComment} className="comment-input-area">
                        <img src={user?.avatar} alt="You" className="comment-avatar" />
                        <div className="input-wrapper">
                            <input
                                type="text"
                                placeholder={tabName === 'geral' ? 'Escreva um comentário geral...' : `Comentar sobre ${tabName}...`}
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <button type="submit" disabled={!newComment.trim()}>
                                <Send size={18} />
                            </button>
                        </div>
                    </form>
                )}
            </>
        );
    };

    return (
        <>
            {/* ── Modal de Confirmação (substitui window.confirm/alert) ────── */}
            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={confirmDialog.onConfirm}
                onCancel={closeConfirm}
            />

            <div className="modal-overlay">
                <div className="modal-content nova-pauta-modal" onClick={e => e.stopPropagation()}>

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="nova-pauta-header-premium">
                        <div className="header-left-premium">
                            <div className="header-icon-premium"><FileText size={24} /></div>
                            <div className="header-titles-premium">
                                {isEditingTitle ? (
                                    <input
                                        type="text"
                                        className="input-premium title-input-premium"
                                        style={{ margin: 0, padding: '4px 8px', height: 'auto', fontSize: '1.5rem', fontWeight: 800 }}
                                        value={editTitleContent}
                                        onChange={e => setEditTitleContent(e.target.value)}
                                        onBlur={() => {
                                            setIsEditingTitle(false);
                                            if (editTitleContent.trim() && editTitleContent !== editedTask.title) {
                                                handleFieldChange('title', editTitleContent.trim());
                                            }
                                        }}
                                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        autoFocus
                                    />
                                ) : (
                                    <h2 title={!isViewer ? "Clique para editar o título" : ""} onClick={() => !isViewer && setIsEditingTitle(true)} style={{ cursor: !isViewer ? 'pointer' : 'default' }}>
                                        {editedTask.title}
                                    </h2>
                                )}
                                <span className="header-subtitle-premium">Detalhamento da Pauta</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                            <select
                                className="select-premium"
                                style={{ width: 'auto', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1.5px solid #e2e8f0', background: 'white' }}
                                value={editedTask.priority}
                                onChange={e => handleFieldChange('priority', e.target.value as any)}
                                disabled={isViewer}
                            >
                                <option value="baixa">🟢 Baixa</option>
                                <option value="media">🟡 Média</option>
                                <option value="alta">🔴 Alta</option>
                            </select>

                            <div style={{ fontSize: '0.7rem', fontWeight: 800, padding: '6px 12px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                {editedTask.status.toUpperCase()}
                            </div>

                            <button className="close-btn-premium" onClick={onClose} title="Fechar">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="nova-pauta-body-premium">
                        {/* ── Abas ─────────────────────────────────────────────── */}
                        <div className="tabs-bar-premium">
                            {([
                                ['geral', 'Geral'],
                                ['release', '📝 Release'],
                                ['post', '📱 Post'],
                                ['video', '🎬 Vídeo'],
                                ['foto', '📸 Foto'],
                                ['arte', '🎨 Arte'],
                                ['inauguracao', '🏛️ Inauguração'],
                            ] as [string, string][]).map(([tab, label]) => (
                                <button
                                    key={tab}
                                    type="button"
                                    data-tab={tab}
                                    className={`tab-btn-premium ${activeTab === tab ? 'active' : ''} ${tab !== 'geral' && editedTask.type.includes(tab as TaskType) ? 'has-type' : ''}`}
                                    onClick={() => setActiveTab(tab as any)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* ════════════════════════════════════════
                            ABA: GERAL
                        ════════════════════════════════════════ */}
                        <div className="modal-body">
                            <div className="modal-main-col-premium" style={{ gap: 0 }}>
                                {activeTab === 'geral' && (
                                    <>

                                    {/* 01 – Informações */}
                                    <div className="modal-section-group-premium">
                                        <div className="section-header-premium">
                                            <span className="section-number-premium">01</span>
                                            <h3>Informações da Pauta</h3>
                                            {!isEditingDesc && !isViewer && (
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
                                                    style={{ width: '100%', minHeight: 100, padding: 12, fontSize: '0.9rem' }}
                                                />
                                                <div className="edit-actions" style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button className="btn-secondary small" onClick={() => { setIsEditingDesc(false); setEditDescContent(editedTask.description); }}>Cancelar</button>
                                                    <button className="btn-primary small" onClick={() => { handleFieldChange('description', editDescContent); setIsEditingDesc(false); }}>Concluir</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="task-description" style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                                {editedTask.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma descrição informada.</span>}
                                            </p>
                                        )}
                                    </div>

                                    {/* 02 – Agendamento */}
                                    <div className="modal-section-group-premium alternate-bg-premium">
                                        <div className="section-header-premium">
                                            <span className="section-number-premium">02</span>
                                            <h3>Agendamento e Local</h3>
                                            {!isEditingAgendamento && !isViewer && (
                                                <button className="btn-edit-premium" onClick={() => setIsEditingAgendamento(true)}>Editar</button>
                                            )}
                                        </div>

                                        {isEditingAgendamento ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Data</label>
                                                        <input type="date" className="input-premium" value={editedTask.pauta_data || ''} onChange={e => handleFieldChange('pauta_data', e.target.value)} />
                                                    </div>
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Início</label>
                                                        <input type="time" className="input-premium" value={editedTask.pauta_horario_start || ''} onChange={e => handleFieldChange('pauta_horario_start', e.target.value)} />
                                                    </div>
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Término</label>
                                                        <input type="time" className="input-premium" value={editedTask.pauta_horario_end || ''} onChange={e => handleFieldChange('pauta_horario_end', e.target.value)} />
                                                    </div>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Endereço Completo</label>
                                                        <input type="text" className="input-premium" value={editedTask.pauta_endereco || ''} onChange={e => handleFieldChange('pauta_endereco', e.target.value)} placeholder="Local da pauta..." />
                                                    </div>
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Saída do Paço</label>
                                                        <input type="time" className="input-premium" value={editedTask.pauta_saida || ''} onChange={e => handleFieldChange('pauta_saida', e.target.value)} />
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
                                                    {/* Salva sem fechar o modal */}
                                                    <button className="btn-primary small" onClick={() => handleSaveSection(() => setIsEditingAgendamento(false))}>
                                                        Concluir Agendamento
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Data</div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                                            {editedTask.pauta_data ? format(new Date(editedTask.pauta_data + 'T12:00:00'), 'dd/MM/yyyy') : '---'}
                                                            {editedTask.pauta_data && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>({getDayOfWeek(editedTask.pauta_data)})</span>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Horário</div>
                                                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                                            {editedTask.pauta_horario_start || '--:--'} {editedTask.pauta_horario_end ? `às ${editedTask.pauta_horario_end}` : ''}
                                                        </div>
                                                    </div>
                                                    {editedTask.pauta_saida && (
                                                        <div>
                                                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Saída do Paço</div>
                                                            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7' }}>{editedTask.pauta_saida}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                {editedTask.pauta_endereco && (
                                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                                            <div style={{ width: 32, height: 32, background: '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                                <MapPin size={18} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>LOCALIZAÇÃO</div>
                                                                <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{editedTask.pauta_endereco}</div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editedTask.pauta_endereco)}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="btn-edit-premium"
                                                            style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', background: 'white' }}
                                                        >Ver no Mapa</a>
                                                    </div>
                                                )}

                                                {editedTask.is_pauta_externa && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: '0.75rem', fontWeight: 700, background: '#ecfdf5', padding: '6px 12px', borderRadius: 20, alignSelf: 'flex-start' }}>
                                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #d1fae5' }}></div>
                                                        AGENDADA PARA EQUIPE EXTERNA
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 03 – Equipe */}
                                    <div className="modal-section-group-premium">
                                        <div className="section-header-premium">
                                            <span className="section-number-premium">03</span>
                                            <h3>Equipe e Responsáveis</h3>
                                            {!isEditingEquipe && !isViewer && (
                                                <button className="btn-edit-premium" onClick={() => setIsEditingEquipe(true)}>Editar</button>
                                            )}
                                        </div>

                                        {isEditingEquipe ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                <div className="nova-pauta-field-premium">
                                                    <label className="field-label-premium">Departamento / Secretaria Solicitante</label>
                                                    <SecretariasMultiSelect
                                                        selected={editedTask.secretarias || []}
                                                        onChange={v => handleFieldChange('secretarias', v)}
                                                    />
                                                </div>
                                                <div className="nova-pauta-field-premium">
                                                    <label className="field-label-premium">Responsáveis na SECOM</label>
                                                    <TeamMultiSelect
                                                        selected={(editedTask.creator || '').split(',').map(s => s.trim()).filter(Boolean)}
                                                        onChange={v => handleFieldChange('creator', v.join(', '))}
                                                    />
                                                </div>
                                                {editedTask.is_pauta_externa && (
                                                    <div className="nova-pauta-field-premium">
                                                        <label className="field-label-premium">Equipe de Cobertura (Externa)</label>
                                                        <TeamMultiSelect
                                                            selected={editedTask.assignees || []}
                                                            onChange={v => handleFieldChange('assignees', v)}
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button className="btn-primary small" onClick={() => handleSaveSection(() => setIsEditingEquipe(false))}>
                                                        Concluir Equipe
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Secretarias</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {(editedTask.secretarias || []).length > 0
                                                            ? (editedTask.secretarias || []).map(s => (
                                                                <span key={s} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontWeight: 500 }}>{s}</span>
                                                            ))
                                                            : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma secretaria vinculada.</span>
                                                        }
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Responsáveis</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {editedTask.creator
                                                            ? editedTask.creator.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                                                <span key={c} style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: 6, border: '1px solid #dbeafe', fontWeight: 500 }}>{c}</span>
                                                            ))
                                                            : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum responsável definido.</span>
                                                        }
                                                    </div>
                                                </div>
                                                {editedTask.assignees && editedTask.assignees.length > 0 && (
                                                    <div style={{ gridColumn: 'span 2' }}>
                                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Equipe Externa</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {editedTask.assignees.map(a => (
                                                                <span key={a} style={{ fontSize: '0.75rem', background: '#f5f3ff', color: '#5b21b6', padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd6fe', fontWeight: 500 }}>{a}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* 04 – Extras */}
                                    <div className="modal-section-group-premium alternate-bg-premium">
                                        <div className="section-header-premium">
                                            <span className="section-number-premium">04</span>
                                            <h3>Configurações Extras</h3>
                                            {!isEditingExtras && !isViewer && (
                                                <button className="btn-edit-premium" onClick={() => setIsEditingExtras(true)}>Editar</button>
                                            )}
                                        </div>

                                        {isEditingExtras ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <div className="nova-pauta-field-premium">
                                                    <label className="field-label-premium">Nível de Prioridade</label>
                                                    <div className="prio-pills-container-premium" style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                                                        {['baixa', 'media', 'alta'].map(p => (
                                                            <button key={p} type="button"
                                                                onClick={() => handleFieldChange('priority', p)}
                                                                className={`prio-pill-premium ${p} ${editedTask.priority === p ? 'active' : ''}`}
                                                                style={{ flex: 1, padding: 8, fontSize: '0.75rem' }}
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
                                                    <button className="btn-primary small" onClick={() => handleSaveSection(() => setIsEditingExtras(false))}>
                                                        Concluir Configurações
                                                    </button>
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c2410c', fontSize: '0.75rem', fontWeight: 800, background: '#fff7ed', padding: '4px 12px', borderRadius: 20, border: '1.5px solid #fed7aa' }}>
                                                            <Award size={14} /> CONFIRMADO
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>Não prevista</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 05 – Anexos */}
                                    <div className="modal-section-group-premium">
                                        <div className="section-header-premium">
                                            <span className="section-number-premium">05</span>
                                            <h3>Anexos ({(editedTask.attachments || []).length})</h3>
                                            {!isViewer && (
                                                <>
                                                    <button className="btn-edit-premium" style={{ gap: 6 }} onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachments}>
                                                        {uploadingAttachments ? 'Enviando...' : <><Plus size={14} /> Adicionar</>}
                                                    </button>
                                                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileUpload} />
                                                </>
                                            )}
                                        </div>

                                        {(editedTask.attachments || []).length > 0 ? (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                                                {editedTask.attachments?.map(att => (
                                                    <div
                                                        key={att.id}
                                                        className="attachment-card-premium"
                                                        onClick={() => setViewingFile(att)}
                                                        style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '0.85rem', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', display: 'flex', alignItems: 'center', gap: '0.85rem', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                                                        onMouseOver={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                                                        onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'; }}
                                                    >
                                                        <div style={{ width: 42, height: 42, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', overflow: 'hidden' }}>
                                                            {att.type === 'image' ? (
                                                                <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <FileIcon type={att.type} />
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>{att.size}</div>
                                                        </div>
                                                        {!isViewer && (
                                                            <button
                                                                className="att-delete-btn-premium"
                                                                onClick={e => { e.stopPropagation(); handleRemoveAttachment(att); }}
                                                                style={{ background: 'none', border: 'none', color: '#cbd5e1', padding: 6, cursor: 'pointer', transition: 'all 0.2s', borderRadius: 6 }}
                                                                onMouseOver={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
                                                                onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'none'; }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: 16, border: '2px dashed #e2e8f0', marginTop: '1rem' }}>
                                                <Paperclip size={24} style={{ color: '#cbd5e1', marginBottom: 8 }} />
                                                <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>Nenhum anexo adicionado nesta pauta ainda.</div>
                                            </div>
                                        )}
                                    </div>

                                    </>
                                )}

                        {activeTab === 'release' && (
                            <>
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
                            </>
                        )}

                        {activeTab === 'post' && (
                            <>
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
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginTop: '0.75rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={!!editedTask.post_criacao_corrigido}
                                                onChange={e => handleFieldChange('post_criacao_corrigido', e.target.checked)}
                                                style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                                            />
                                            Texto de Criação Corrigido
                                        </label>
                                    </div>
                                </div>

                                <div className="modal-section-group-premium alternate-bg-premium" style={{ margin: '0 -2rem', padding: '1.5rem 2rem' }}>
                                    <div className="section-header-premium">
                                        <span className="section-number-premium" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>✓</span>
                                        <h3>Controle de Aprovação</h3>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                        <div
                                            className={`pauta-externa-toggle-card-premium ${editedTask.post_aprovado ? 'active' : ''}`}
                                            onClick={() => { handleFieldChange('post_aprovado', !editedTask.post_aprovado); if (!editedTask.post_aprovado) handleFieldChange('post_reprovado', false); }}
                                        >
                                            <div className="toggle-info-premium">
                                                <span className="toggle-title-premium">Post Aprovado</span>
                                                <span className="toggle-description-premium">Pronto para publicação</span>
                                            </div>
                                            <div className={`toggle-switch-premium ${editedTask.post_aprovado ? 'on' : ''}`}>
                                                <div className="toggle-knob-premium"></div>
                                            </div>
                                        </div>

                                        <div className="fields-grid-2-premium" style={{ marginTop: '0.5rem' }}>
                                            <div className="nova-pauta-field-premium">
                                                <label className="field-label-premium">DATA DA POSTAGEM</label>
                                                <input 
                                                    type="date" 
                                                    className="input-premium" 
                                                    value={editedTask.post_data_postagem || ''} 
                                                    onChange={e => handleFieldChange('post_data_postagem', e.target.value)} 
                                                />
                                            </div>
                                            <div className="nova-pauta-field-premium">
                                                <label className="field-label-premium">HORÁRIO DA POSTAGEM</label>
                                                <input 
                                                    type="time" 
                                                    className="input-premium time-input-premium" 
                                                    value={editedTask.post_horario_postagem || ''} 
                                                    onChange={e => handleFieldChange('post_horario_postagem', e.target.value)} 
                                                />
                                            </div>
                                        </div>

                                        <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
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

                                        <div style={{ background: editedTask.post_reprovado ? '#fff1f2' : 'white', padding: '1.25rem', borderRadius: 12, border: editedTask.post_reprovado ? '1.5px solid #fda4af' : '1.5px solid #e2e8f0', transition: 'all 0.2s' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editedTask.post_reprovado ? '1rem' : 0 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: editedTask.post_reprovado ? '#be123c' : '#1e293b' }}>Post Reprovado / Cancelado</span>
                                                    <span style={{ fontSize: '0.75rem', color: editedTask.post_reprovado ? '#e11d48' : '#64748b' }}>Marcar se o material foi descartado</span>
                                                </div>
                                                <div
                                                    className={`toggle-switch-premium ${editedTask.post_reprovado ? 'on' : ''}`}
                                                    onClick={() => { const v = !editedTask.post_reprovado; handleFieldChange('post_reprovado', v); if (v) handleFieldChange('post_aprovado', false); }}
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
                                        {([
                                            { id: 'release', label: 'Release' },
                                            { id: 'post', label: 'Post' },
                                            { id: 'video', label: 'Vídeo' },
                                            { id: 'foto', label: 'Foto' },
                                            { id: 'arte', label: 'Arte' },
                                            { id: 'inauguracao', label: 'Inauguração' },
                                        ] as { id: TaskType; label: string }[]).map(mat => {
                                            const isActive = editedTask.type.includes(mat.id);
                                            return (
                                                <button
                                                    key={mat.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const newTypes = isActive
                                                            ? editedTask.type.filter(t => t !== mat.id)
                                                            : [...editedTask.type, mat.id];
                                                        const finalTypes = newTypes.length > 0 ? newTypes : ['release' as TaskType];
                                                        handleFieldChange('type', finalTypes);
                                                        handleFieldChange('post_material_solicitado', finalTypes.map(t => {
                                                            if (t === 'video') return 'Vídeo';
                                                            if (t === 'foto') return 'Foto';
                                                            return t.charAt(0).toUpperCase() + t.slice(1);
                                                        }));
                                                    }}
                                                    className={`prio-pill-premium ${isActive ? 'active' : ''}`}
                                                    style={{ padding: '1rem', fontSize: '1rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', background: isActive ? '#1e293b' : 'white', color: isActive ? 'white' : '#475569', border: '1.5px solid', borderColor: isActive ? '#1e293b' : '#e2e8f0', boxShadow: isActive ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', cursor: 'pointer' }}
                                                >
                                                    {mat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                        💡 Selecione os formatos previstos para esta estratégia de post.
                                    </p>
                                </div>

                                <section className="modal-section-group-premium">
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão do Post</h3>
                                    {renderCommentsByTab('post')}
                                </section>
                            </>
                        )}

                        {activeTab === 'video' && (
                            <>
                                <div className="modal-section-group-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">🎬</span>
                                        <h3>Planejamento de Vídeo</h3>
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Resumo da Pauta / Briefing de Vídeo</label>
                                        <textarea className="input-premium-textarea" rows={6} placeholder="Objetivo do vídeo, roteiro básico..." value={editedTask.video_briefing || ''} onChange={e => handleFieldChange('video_briefing', e.target.value)} />
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
                                            <TeamMultiSelect selected={editedTask.video_captacao_equipe || []} onChange={v => handleFieldChange('video_captacao_equipe', v)} />
                                        </div>
                                        <div className="detail-item-premium">
                                            <label className="detail-label-premium">Data Captação</label>
                                            <input type="date" className="input-premium" value={editedTask.video_captacao_data ? new Date(editedTask.video_captacao_data).toISOString().split('T')[0] : ''} onChange={e => handleFieldChange('video_captacao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                                        </div>
                                        <div className="detail-item-premium">
                                            <label className="detail-label-premium">Edição / Finalização</label>
                                            <TeamMultiSelect selected={editedTask.video_edicao_equipe || []} onChange={v => handleFieldChange('video_edicao_equipe', v)} />
                                        </div>
                                        <div className="detail-item-premium">
                                            <label className="detail-label-premium">Previsão de Edição</label>
                                            <input type="date" className="input-premium" value={editedTask.video_edicao_data ? new Date(editedTask.video_edicao_data).toISOString().split('T')[0] : ''} onChange={e => handleFieldChange('video_edicao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-section-group-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">03</span>
                                        <h3>O que precisa ser feito?</h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                                        {[
                                            { id: 'cobertura', label: 'Cobertura (Imagens)' },
                                            { id: 'depoimentos', label: 'Depoimentos' },
                                            { id: 'drone', label: 'Imagens Aéreas (Drone)' },
                                        ].map(item => (
                                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={(editedTask.video_necessidades || []).includes(item.id)}
                                                    onChange={e => {
                                                        const cur = editedTask.video_necessidades || [];
                                                        handleFieldChange('video_necessidades', e.target.checked ? [...cur, item.id] : cur.filter(x => x !== item.id));
                                                    }}
                                                    style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                                                />
                                                {item.label}
                                            </label>
                                        ))}
                                    </div>
                                    {(editedTask.video_necessidades || []).includes('depoimentos') && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>
                                            <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: 4 }}>💡 AVISO:</span> Não esqueça de levar o microfone!
                                        </div>
                                    )}
                                </div>

                                <div className="modal-section-group-premium alternate-bg-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">🎬</span>
                                        <h3>Controle de Entrega</h3>
                                    </div>
                                    <div style={{ maxWidth: 300 }}>
                                        <div className="detail-item-premium">
                                            <label className="detail-label-premium">Prazo Máximo de Entrega</label>
                                            <input type="date" className="input-premium" value={editedTask.video_entrega_data ? new Date(editedTask.video_entrega_data).toISOString().split('T')[0] : ''} onChange={e => handleFieldChange('video_entrega_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} />
                                        </div>
                                    </div>
                                </div>

                                <section className="modal-section-group-premium">
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Vídeo)</h3>
                                    {renderCommentsByTab('video')}
                                </section>
                            </>
                        )}

                        {/* ════════════════════════════════════════
                            ABA: FOTO
                        ════════════════════════════════════════ */}
                        {activeTab === 'foto' && (
                            <>
                                <div className="modal-section-group-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">📸</span>
                                        <h3>Produção de Fotografia</h3>
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Briefing de Fotografia</label>
                                        <textarea className="input-premium-textarea" rows={4} placeholder="O que deve ser fotografado, estilo das fotos..." value={editedTask.foto_briefing || ''} onChange={e => handleFieldChange('foto_briefing', e.target.value)} />
                                    </div>
                                </div>
                                <section className="modal-section-group-premium">
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Foto)</h3>
                                    {renderCommentsByTab('foto')}
                                </section>
                            </>
                        )}

                        {/* ════════════════════════════════════════
                            ABA: ARTE
                        ════════════════════════════════════════ */}
                        {activeTab === 'arte' && (
                            <>
                                <div className="modal-section-group-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">🎨</span>
                                        <h3>Solicitação de Peças Gráficas</h3>
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Quais peças são necessárias?</label>
                                        <textarea className="input-premium-textarea" rows={4} placeholder="Ex: Card para Instagram, Banner para site, Cartaz A3..." value={editedTask.arte_pecas || ''} onChange={e => handleFieldChange('arte_pecas', e.target.value)} />
                                    </div>
                                </div>

                                <div className="modal-section-group-premium alternate-bg-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">📏</span>
                                        <h3>Formatos e Especificações</h3>
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Informações Relevantes / Texto da Arte</label>
                                        <textarea className="input-premium-textarea" rows={4} placeholder="Conteúdo textual que deve constar na arte..." value={editedTask.arte_informacoes || ''} onChange={e => handleFieldChange('arte_informacoes', e.target.value)} />
                                    </div>
                                </div>

                                <section className="modal-section-group-premium">
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Arte)</h3>
                                    {renderCommentsByTab('arte')}
                                </section>
                            </>
                        )}

                        {/* ════════════════════════════════════════
                            ABA: INAUGURAÇÃO
                        ════════════════════════════════════════ */}
                        {activeTab === 'inauguracao' && (
                            <>
                                <div className="modal-section-group-premium">
                                    <div className="section-header-premium">
                                        <span className="section-number-premium">🏛️</span>
                                        <h3>Gestão de Inauguração</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                        <div
                                            className={`pauta-externa-toggle-card-premium ${editedTask.inauguracao_tipo === 'simples' ? 'active' : ''}`}
                                            onClick={() => {
                                                handleFieldChange('inauguracao_tipo', 'simples');
                                                handleFieldChange('inauguracao_checklist', [
                                                    { id: 'placa', label: 'Placa de inauguração', done: false },
                                                    { id: 'backdrop', label: 'Backdrop', done: false },
                                                ]);
                                                if (!editedTask.type.includes('inauguracao')) {
                                                    handleFieldChange('type', [...editedTask.type, 'inauguracao']);
                                                }
                                            }}
                                            style={{ padding: '1.25rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
                                        >
                                            <input
                                                type="radio"
                                                name="inauguracao_tipo"
                                                checked={editedTask.inauguracao_tipo === 'simples'}
                                                readOnly
                                                style={{ accentColor: '#e11d48', width: 20, height: 20 }}
                                            />
                                            <div className="toggle-info-premium" style={{ marginLeft: '1rem' }}>
                                                <span className="toggle-title-premium">Inauguração Simples</span>
                                                <span className="toggle-description-premium">Placa + Backdrop</span>
                                            </div>
                                        </div>

                                        <div
                                            className={`pauta-externa-toggle-card-premium ${editedTask.inauguracao_tipo === 'master' ? 'active' : ''}`}
                                            onClick={() => {
                                                handleFieldChange('inauguracao_tipo', 'master');
                                                handleFieldChange('inauguracao_checklist', [
                                                    { id: 'placa', label: 'Placa de inauguração', done: false },
                                                    { id: 'backdrops', label: 'Backdrops / banners', done: false },
                                                    { id: 'telao', label: '1 Telão', done: false },
                                                    { id: 'video_telao', label: 'Vídeo para telão', done: false },
                                                ]);
                                                if (!editedTask.type.includes('inauguracao')) {
                                                    handleFieldChange('type', [...editedTask.type, 'inauguracao']);
                                                }
                                            }}
                                            style={{ padding: '1.25rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
                                        >
                                            <input
                                                type="radio"
                                                name="inauguracao_tipo"
                                                checked={editedTask.inauguracao_tipo === 'master'}
                                                readOnly
                                                style={{ accentColor: '#e11d48', width: 20, height: 20 }}
                                            />
                                            <div className="toggle-info-premium" style={{ marginLeft: '1rem' }}>
                                                <span className="toggle-title-premium">Evento Master</span>
                                                <span className="toggle-description-premium">Estrutura completa</span>
                                            </div>
                                        </div>
                                    </div>

                                    {editedTask.inauguracao_tipo && (
                                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ background: '#e11d48', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✓</span>
                                                CHECKLIST DE PRODUÇÃO
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                {(editedTask.inauguracao_checklist || []).map(item => (
                                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.75rem', background: 'white', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={item.done}
                                                            onChange={e => {
                                                                const newList = (editedTask.inauguracao_checklist || []).map(i =>
                                                                    i.id === item.id ? { ...i, done: e.target.checked } : i
                                                                );
                                                                handleFieldChange('inauguracao_checklist', newList);
                                                            }}
                                                            style={{ width: 18, height: 18, accentColor: '#e11d48' }}
                                                        />
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: item.done ? '#94a3b8' : '#334155', textDecoration: item.done ? 'line-through' : 'none' }}>
                                                            {item.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <section className="modal-section-group-premium">
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Inauguração</h3>
                                    {renderCommentsByTab('inauguracao')}
                                </section>
                            </>
                        )}

                                </div> {/* Fim modal-main-col-premium */}

                                {/* ── Sidebar Global ─────────────────────────────────── */}
                                <div className="modal-side-col-premium">
                                    <div className="side-section-premium">
                                        <div className="side-title-premium" style={{ color: '#64748b' }}>STATUS DA PAUTA</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div className={`status-badge-premium ${editedTask.status}`} style={{ width: '100%', padding: 8, fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', borderRadius: 10 }}>
                                                {editedTask.status.toUpperCase()}
                                            </div>
                                            <select
                                                className="select-premium"
                                                style={{ width: '100%', padding: 8, borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 }}
                                                value={editedTask.status}
                                                onChange={e => handleFieldChange('status', e.target.value)}
                                                disabled={isViewer}
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

                                    <div className="side-section-premium">
                                        <div className="side-title-premium" style={{ color: '#64748b' }}>GESTÃO</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {!isViewer && (
                                                editedTask.archived ? (
                                                    <button className="btn-side-action-premium" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }} onClick={async () => { await unarchiveTask(task.id); onClose(); }}>
                                                        <RotateCcw size={16} /> Reativar Pauta
                                                    </button>
                                                ) : (
                                                    <button className="btn-side-action-premium" onClick={() => handleArchive(onArchive)}>
                                                        <Archive size={16} /> Arquivar Pauta
                                                    </button>
                                                )
                                            )}
                                            {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                                                <button className="btn-side-action-premium danger" style={{ marginTop: '0.5rem' }} onClick={handleDelete}>
                                                    <Trash2 size={16} /> Excluir Pauta
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                                        <div className="side-section-premium" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                            <div className="side-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                                                <Activity size={14} /> HISTÓRICO DE ATIVIDADES
                                            </div>
                                            <div className="activity-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', paddingRight: 8, marginTop: 4 }}>
                                                {activityLogs.filter(log => !log.details.includes('Banco de Dados')).length > 0 ? 
                                                    activityLogs
                                                        .filter(log => !log.details.includes('Banco de Dados'))
                                                        .map((log, idx) => (
                                                        <div key={log.id} style={{ fontSize: '0.75rem', borderLeft: '2px solid #f1f5f9', paddingLeft: 14, position: 'relative' }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? '#3b82f6' : '#e2e8f0', position: 'absolute', left: -5, top: 4, boxShadow: idx === 0 ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none' }}></div>
                                                            <div style={{ fontWeight: 700, color: '#334155' }}>{log.user_name}</div>
                                                            <div style={{ color: '#64748b', margin: '3px 0', lineHeight: 1.4 }}>
                                                                {log.details.includes('Pauta criada via RPC Blindada') ? 'Pauta criada com sucesso' : log.details}
                                                            </div>
                                                            <div style={{ color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 600 }}>{format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}</div>
                                                        </div>
                                                    )) : (
                                                    <div style={{ textAlign: 'center', padding: '2rem 0', color: '#cbd5e1' }}>
                                                        <Activity size={20} style={{ opacity: 0.3, marginBottom: 8 }} />
                                                        <p style={{ fontSize: '0.7rem', fontStyle: 'italic', margin: 0 }}>Nenhuma atividade registrada.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div> {/* Fim modal-side-col-premium */}
                            </div> {/* Fim modal-body */}
                        </div>{/* fim nova-pauta-body-premium */}

                        {hasUnsavedChanges && (
                            <div className="save-banner-premium" style={{ 
                                position: 'absolute', 
                                bottom: '2rem', 
                                right: '2.5rem', 
                                width: '320px', 
                                padding: '1.25rem', 
                                background: '#1e293b', 
                                borderRadius: 16, 
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)', 
                                zIndex: 1100,
                                animation: 'slideUp 0.3s ease-out' 
                            }}>
                                <div style={{ color: 'white', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.85rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <div style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%' }}></div>
                                    Alterações não salvas
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-save-banner-cancel-premium" style={{ flex: 1, padding: 8, fontSize: '0.75rem' }} onClick={handleDiscard}>Descartar</button>
                                    <button className="btn-save-banner-confirm-premium" style={{ flex: 1, padding: 8, fontSize: '0.75rem' }} onClick={() => handleSave(false)}>Salvar Tudo</button>
                                </div>
                            </div>
                        )}
                    </div> {/* fim modal-content */}
                </div> {/* fim modal-overlay */}

            {viewingFile && (
                <FileViewer 
                    attachment={viewingFile} 
                    attachments={editedTask.attachments || []} 
                    onClose={() => setViewingFile(null)} 
                />
            )}
        </>
    );
}
