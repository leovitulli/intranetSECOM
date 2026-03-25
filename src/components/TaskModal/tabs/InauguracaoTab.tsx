import React from 'react';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface InauguracaoTabProps {
    task: Task;
    isViewer: boolean;
    isEditingInauguracao: boolean;
    setIsEditingInauguracao: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const InauguracaoTab: React.FC<InauguracaoTabProps> = ({
    task,
    isViewer,
    isEditingInauguracao,
    setIsEditingInauguracao,
    onFieldChange,
    onSaveSection,
    user,
    newComment,
    setNewComment,
    handleAddComment
}) => {
    return (
        <div className="modal-main-col-premium" style={{ gap: 0 }}>
            <PremiumSection
                icon="🏛️"
                title="Gestão de Inauguração"
                isEditing={isEditingInauguracao}
                isViewer={isViewer}
                onEdit={() => setIsEditingInauguracao(true)}
            >
                {isEditingInauguracao ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div
                                className={`pauta-externa-toggle-card-premium ${task.inauguracao_tipo === 'simples' ? 'active' : ''}`}
                                onClick={() => {
                                    onFieldChange('inauguracao_tipo', 'simples');
                                    onFieldChange('inauguracao_checklist', [
                                        { id: 'placa', label: 'Placa de inauguração', done: false },
                                        { id: 'backdrop', label: 'Backdrop', done: false },
                                    ]);
                                }}
                                style={{ padding: '1.25rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
                            >
                                <div className="toggle-info-premium">
                                    <span className="toggle-title-premium">Simples</span>
                                    <span className="toggle-description-premium">Placa + Backdrop</span>
                                </div>
                            </div>

                            <div
                                className={`pauta-externa-toggle-card-premium ${task.inauguracao_tipo === 'master' ? 'active' : ''}`}
                                onClick={() => {
                                    onFieldChange('inauguracao_tipo', 'master');
                                    onFieldChange('inauguracao_checklist', [
                                        { id: 'placa', label: 'Placa de inauguração', done: false },
                                        { id: 'backdrops', label: 'Backdrops / banners', done: false },
                                        { id: 'telao', label: '1 Telão', done: false },
                                        { id: 'video_telao', label: 'Vídeo para telão', done: false },
                                    ]);
                                }}
                                style={{ padding: '1.25rem', border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
                            >
                                <div className="toggle-info-premium">
                                    <span className="toggle-title-premium">Evento Master</span>
                                    <span className="toggle-description-premium">Estrutura completa</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: 16, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '1rem' }}>Checklist de Produção</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {(task.inauguracao_checklist || []).map(item => (
                                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '0.75rem', background: 'white', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                        <input
                                            type="checkbox"
                                            checked={item.done}
                                            onChange={e => {
                                                const newList = (task.inauguracao_checklist || []).map(i =>
                                                    i.id === item.id ? { ...i, done: e.target.checked } : i
                                                );
                                                onFieldChange('inauguracao_checklist', newList);
                                            }}
                                            style={{ width: 18, height: 18, accentColor: '#e11d48' }}
                                        />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: item.done ? '#94a3b8' : '#334155' }}>
                                            {item.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingInauguracao(false))}>
                                Concluir Inauguração
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#fff1f2', padding: '1rem', borderRadius: 12, border: '1.5px solid #fecdd3' }}>
                            <span style={{ fontSize: '1.5rem' }}>{task.inauguracao_tipo === 'master' ? '👑' : '📍'}</span>
                            <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#e11d48', textTransform: 'uppercase' }}>Tipo de Evento</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#881337' }}>
                                    {task.inauguracao_tipo === 'master' ? 'Evento Master VIP' : task.inauguracao_tipo === 'simples' ? 'Inauguração Simples' : 'Tipo não definido'}
                                </div>
                            </div>
                        </div>

                        <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '1rem' }}>Estatus de Produção</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                                {(task.inauguracao_checklist || []).map(item => (
                                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: item.done ? '#f0fdf4' : '#f8fafc', border: `1px solid ${item.done ? '#bbf7d0' : '#e2e8f0'}` }}>
                                        <span style={{ fontSize: '0.8rem', color: item.done ? '#16a34a' : '#94a3b8' }}>{item.done ? '●' : '○'}</span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: item.done ? '#166534' : '#64748b' }}>{item.label}</span>
                                    </div>
                                ))}
                                {(!task.inauguracao_checklist || task.inauguracao_checklist.length === 0) && (
                                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Nenhum checklist definido.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Inauguração</h3>
                <CommentSystem 
                    task={task} 
                    tabName="inauguracao" 
                    user={user} 
                    newComment={newComment} 
                    setNewComment={setNewComment} 
                    handleAddComment={handleAddComment} 
                    isViewer={isViewer} 
                />
            </section>
        </div>
    );
};
