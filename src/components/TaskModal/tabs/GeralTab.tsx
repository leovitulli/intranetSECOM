import React from 'react';
import { format } from 'date-fns';
import { MapPin, Award, Plus, File, X } from 'lucide-react';
import { PremiumSection } from '../components/PremiumSection';
import SecretariasMultiSelect from '../../SecretariasMultiSelect';
import TeamMultiSelect from '../../TeamMultiSelect';
import type { Task, Attachment, TaskType } from '../../../types/kanban';

interface GeralTabProps {
    task: Task;
    isViewer: boolean;
    // States
    editingStates: {
        isEditingDesc: boolean;
        isEditingAgendamento: boolean;
        isEditingEquipe: boolean;
        isEditingExtras: boolean;
    };
    setEditingStates: {
        setIsEditingDesc: (v: boolean) => void;
        setIsEditingAgendamento: (v: boolean) => void;
        setIsEditingEquipe: (v: boolean) => void;
        setIsEditingExtras: (v: boolean) => void;
    };
    // Contents
    editDescContent: string;
    setEditDescContent: (v: string) => void;
    // Handlers
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onRemoveAttachment: (att: Attachment) => void;
    isSaving: boolean;
    // Utils/Refs
    getDayOfWeek: (dateStr: string) => string;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    uploadingAttachments: boolean;
    setViewingFile: (att: Attachment | null) => void;
}

export const GeralTab: React.FC<GeralTabProps> = ({
    task,
    isViewer,
    editingStates,
    setEditingStates,
    editDescContent,
    setEditDescContent,
    onFieldChange,
    onSaveSection,
    onFileUpload,
    onRemoveAttachment,
    getDayOfWeek,
    fileInputRef,
    uploadingAttachments,
    setViewingFile,
    isSaving
}) => {
    const { isEditingDesc, isEditingAgendamento, isEditingEquipe, isEditingExtras } = editingStates;
    const { setIsEditingDesc, setIsEditingAgendamento, setIsEditingEquipe, setIsEditingExtras } = setEditingStates;

    return (
        <div className="modal-main-col-premium" style={{ gap: 0 }}>
            {/* 01 – Informações */}
            <PremiumSection
                number="01"
                title="Informações da Pauta"
                isEditing={isEditingDesc}
                isViewer={isViewer}
                onEdit={() => setIsEditingDesc(true)}
            >
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
                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', marginTop: '1rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                                Selecione os Entregáveis
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {([
                                    { id: 'release', label: 'Release' },
                                    { id: 'post', label: 'Post' },
                                    { id: 'video', label: 'Vídeo' },
                                    { id: 'foto', label: 'Foto' },
                                    { id: 'arte', label: 'Arte' },
                                    { id: 'inauguracao', label: 'Inauguração' },
                                ] as { id: TaskType; label: string }[]).map(mat => {
                                    const isActive = task.type.includes(mat.id);
                                    return (
                                        <button
                                            key={mat.id}
                                            type="button"
                                            onClick={() => {
                                                const newTypes = isActive
                                                    ? task.type.filter(t => t !== mat.id)
                                                    : [...task.type, mat.id];
                                                const finalTypes = newTypes.length > 0 ? newTypes : ['release' as TaskType];
                                                onFieldChange('type', finalTypes);
                                                onFieldChange('post_material_solicitado', finalTypes.map(t => {
                                                    if (t === 'video') return 'Vídeo';
                                                    if (t === 'foto') return 'Foto';
                                                    if (t === 'inauguracao') return 'Inauguração';
                                                    return t.charAt(0).toUpperCase() + t.slice(1);
                                                }));
                                            }}
                                            className={`prio-pill-premium ${isActive ? 'active' : ''}`}
                                            style={{ 
                                                padding: '0.5rem', 
                                                fontSize: '0.75rem', 
                                                fontWeight: 700, 
                                                display: 'flex', 
                                                justifyContent: 'center', 
                                                alignItems: 'center', 
                                                background: isActive ? '#1e293b' : 'white', 
                                                color: isActive ? 'white' : '#475569', 
                                                border: '1.5px solid', 
                                                borderColor: isActive ? '#1e293b' : '#e2e8f0', 
                                                cursor: 'pointer', 
                                                borderRadius: 8,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {mat.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="edit-actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-secondary small" onClick={() => { setIsEditingDesc(false); setEditDescContent(task.description); }} disabled={isSaving}>Cancelar</button>
                            <button className="btn-primary small" onClick={() => { onFieldChange('description', editDescContent); setIsEditingDesc(false); }} disabled={isSaving}>
                                {isSaving ? 'Processando...' : 'Concluir'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <p className="task-description" style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, margin: 0 }}>
                            {task.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma descrição informada.</span>}
                        </p>

                        <div style={{ borderTop: '1px dashed #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                                Entregáveis Solicitados
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {([
                                    { id: 'release', label: 'Release' },
                                    { id: 'post', label: 'Post' },
                                    { id: 'video', label: 'Vídeo' },
                                    { id: 'foto', label: 'Foto' },
                                    { id: 'arte', label: 'Arte' },
                                    { id: 'inauguracao', label: 'Inauguração' },
                                ] as { id: TaskType; label: string }[]).map(mat => {
                                    const isActive = task.type.includes(mat.id);
                                    if (!isActive) return null;
                                    return (
                                        <span 
                                            key={mat.id} 
                                            style={{ 
                                                fontSize: '0.75rem', 
                                                fontWeight: 800, 
                                                padding: '4px 12px', 
                                                background: '#f1f5f9', 
                                                color: '#475569', 
                                                borderRadius: 20, 
                                                border: '1.5px solid #e2e8f0' 
                                            }}
                                        >
                                            {mat.label.toUpperCase()}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </PremiumSection>

            {/* 02 – Agendamento */}
            <PremiumSection
                number="02"
                title="Agendamento e Local"
                alternateBg
                isEditing={isEditingAgendamento}
                isViewer={isViewer}
                onEdit={() => setIsEditingAgendamento(true)}
            >
                {isEditingAgendamento ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Data</label>
                                <input type="date" className="input-premium" value={task.pauta_data || ''} onChange={e => onFieldChange('pauta_data', e.target.value)} />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Início</label>
                                <input type="time" className="input-premium" value={task.pauta_horario_start || ''} onChange={e => onFieldChange('pauta_horario_start', e.target.value)} />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Término</label>
                                <input type="time" className="input-premium" value={task.pauta_horario_end || ''} onChange={e => onFieldChange('pauta_horario_end', e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Endereço Completo</label>
                                <input type="text" className="input-premium" value={task.pauta_endereco || ''} onChange={e => onFieldChange('pauta_endereco', e.target.value)} placeholder="Local da pauta..." />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Saída do Paço</label>
                                <input type="time" className="input-premium" value={task.pauta_saida || ''} onChange={e => onFieldChange('pauta_saida', e.target.value)} />
                            </div>
                        </div>

                        <div
                            className={`pauta-externa-toggle-card-premium ${task.is_pauta_externa ? 'active' : ''}`}
                            onClick={() => onFieldChange('is_pauta_externa', !task.is_pauta_externa)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="toggle-info-premium">
                                <span className="toggle-title-premium">Adicionar à Agenda Externa</span>
                            </div>
                            <div className={`toggle-switch-premium ${task.is_pauta_externa ? 'on' : ''}`}>
                                <div className="toggle-knob-premium"></div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingAgendamento(false))} disabled={isSaving}>
                                {isSaving ? 'Processando...' : 'Concluir Agendamento'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Data</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                    {task.pauta_data ? format(new Date(task.pauta_data + 'T12:00:00'), 'dd/MM/yyyy') : '---'}
                                    {task.pauta_data && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>({getDayOfWeek(task.pauta_data)})</span>}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Horário</div>
                                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>
                                    {task.pauta_horario_start || '--:--'} {task.pauta_horario_end ? `às ${task.pauta_horario_end}` : ''}
                                </div>
                            </div>
                            {task.pauta_saida && (
                                <div>
                                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Saída do Paço</div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0284c7' }}>{task.pauta_saida}</div>
                                </div>
                            )}
                        </div>

                        {task.pauta_endereco && (
                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <div style={{ width: 32, height: 32, background: '#eff6ff', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                        <MapPin size={18} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>LOCALIZAÇÃO</div>
                                        <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>{task.pauta_endereco}</div>
                                    </div>
                                </div>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.pauta_endereco)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="btn-edit-premium"
                                    style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none', background: 'white' }}
                                >Ver no Mapa</a>
                            </div>
                        )}

                        {task.is_pauta_externa && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#059669', fontSize: '0.75rem', fontWeight: 700, background: '#ecfdf5', padding: '6px 12px', borderRadius: 20, alignSelf: 'flex-start' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 0 2px #d1fae5' }}></div>
                                AGENDADA PARA EQUIPE EXTERNA
                            </div>
                        )}
                    </div>
                )}
            </PremiumSection>

            {/* 03 – Equipe */}
            <PremiumSection
                number="03"
                title="Equipe e Responsáveis"
                isEditing={isEditingEquipe}
                isViewer={isViewer}
                onEdit={() => setIsEditingEquipe(true)}
            >
                {isEditingEquipe ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Departamento / Secretaria Solicitante</label>
                            <SecretariasMultiSelect
                                selected={task.secretarias || []}
                                onChange={v => onFieldChange('secretarias', v)}
                            />
                        </div>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Responsáveis na SECOM</label>
                            <TeamMultiSelect
                                selected={(task.creator || '').split(',').map(s => s.trim()).filter(Boolean)}
                                onChange={v => onFieldChange('creator', v.join(', '))}
                            />
                        </div>
                        {task.is_pauta_externa && (
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Equipe de Cobertura (Externa)</label>
                                <TeamMultiSelect
                                    selected={task.assignees || []}
                                    onChange={v => onFieldChange('assignees', v)}
                                />
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingEquipe(false))} disabled={isSaving}>
                                {isSaving ? 'Processando...' : 'Concluir Equipe'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Secretarias</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {(task.secretarias || []).length > 0
                                    ? (task.secretarias || []).map(s => (
                                        <span key={s} style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontWeight: 500 }}>{s}</span>
                                    ))
                                    : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma secretaria vinculada.</span>
                                }
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Responsáveis</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {task.creator
                                    ? task.creator.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                                        <span key={c} style={{ fontSize: '0.75rem', background: '#eff6ff', color: '#1e40af', padding: '4px 10px', borderRadius: 6, border: '1px solid #dbeafe', fontWeight: 500 }}>{c}</span>
                                    ))
                                    : <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum responsável definido.</span>
                                }
                            </div>
                        </div>
                        {task.assignees && task.assignees.length > 0 && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Equipe Externa</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {task.assignees.map(a => (
                                        <span key={a} style={{ fontSize: '0.75rem', background: '#f5f3ff', color: '#5b21b6', padding: '4px 10px', borderRadius: 6, border: '1px solid #ddd6fe', fontWeight: 500 }}>{a}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </PremiumSection>

            {/* 04 – Extras */}
            <PremiumSection
                number="04"
                title="Configurações Extras"
                alternateBg
                isEditing={isEditingExtras}
                isViewer={isViewer}
                onEdit={() => setIsEditingExtras(true)}
            >
                {isEditingExtras ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Nível de Prioridade</label>
                            <div className="prio-pills-container-premium" style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                                {['baixa', 'media', 'alta'].map(p => (
                                    <button key={p} type="button"
                                        onClick={() => onFieldChange('priority', p)}
                                        className={`prio-pill-premium ${p} ${task.priority === p ? 'active' : ''}`}
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
                                className={`pauta-externa-toggle-card-premium ${task.presenca_prefeito ? 'active' : ''}`}
                                onClick={() => onFieldChange('presenca_prefeito', !task.presenca_prefeito)}
                                style={{ margin: 0, padding: '0.75rem', cursor: 'pointer' }}
                            >
                                <div className="toggle-info-premium">
                                    <span className="toggle-title-premium" style={{ fontSize: '0.8rem' }}>Presença Confirmada</span>
                                </div>
                                <div className={`toggle-switch-premium ${task.presenca_prefeito ? 'on' : ''}`}>
                                    <div className="toggle-knob-premium"></div>
                                </div>
                            </div>
                        </div>
                        <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingExtras(false))} disabled={isSaving}>
                                {isSaving ? 'Processando...' : 'Concluir Configurações'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Prioridade:</div>
                            <span className={`prio-pill-premium ${task.priority}`} style={{ padding: '4px 14px', fontSize: '0.75rem', pointerEvents: 'none', opacity: 1, fontWeight: 700 }}>
                                {task.priority.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Presença do Prefeito:</div>
                            {task.presenca_prefeito ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#c2410c', fontSize: '0.75rem', fontWeight: 800, background: '#fff7ed', padding: '4px 12px', borderRadius: 20, border: '1.5px solid #fed7aa' }}>
                                    <Award size={14} /> CONFIRMADO
                                </div>
                            ) : (
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 500 }}>Não prevista</span>
                            )}
                        </div>
                    </div>
                )}
            </PremiumSection>

            {/* 05 – Anexos */}
            <PremiumSection
                number="05"
                title={`Anexos (${(task.attachments || []).length})`}
                isViewer={isViewer}
            >
                {!isViewer && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button className="btn-edit-premium" style={{ gap: 6 }} onClick={() => fileInputRef.current?.click()} disabled={uploadingAttachments}>
                            {uploadingAttachments ? 'Enviando...' : <><Plus size={14} /> Adicionar Anexos</>}
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={onFileUpload} />
                    </div>
                )}

                {(task.attachments || []).length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {task.attachments?.map(att => (
                            <div
                                key={att.id}
                                className="attachment-card-premium"
                                onClick={() => setViewingFile(att)}
                                style={{ background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 14, padding: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.85rem' }}
                            >
                                <div style={{ width: 42, height: 42, background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', overflow: 'hidden' }}>
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <File size={20} />
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{att.name}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{att.size} • {att.type.toUpperCase()}</div>
                                </div>
                                {!isViewer && (
                                    <button 
                                        className="remove-btn-premium" 
                                        onClick={(e) => { e.stopPropagation(); onRemoveAttachment(att); }}
                                        disabled={isSaving}
                                        style={{ 
                                            padding: '4px', 
                                            borderRadius: '8px', 
                                            border: 'none', 
                                            background: 'transparent', 
                                            color: '#94a3b8', 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                        Nenhum anexo nesta pauta.
                    </p>
                )}
            </PremiumSection>
        </div>
    );
};
