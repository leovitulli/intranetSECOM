import React from 'react';
import { format } from 'date-fns';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface PostTabProps {
    task: Task;
    isViewer: boolean;
    isEditingPost: boolean;
    setIsEditingPost: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    getDayOfWeek: (date: string) => string;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const PostTab: React.FC<PostTabProps> = ({
    task,
    isViewer,
    isEditingPost,
    setIsEditingPost,
    onFieldChange,
    onSaveSection,
    getDayOfWeek,
    user,
    newComment,
    setNewComment,
    handleAddComment
}) => {
    return (
        <div className="modal-main-col-premium" style={{ gap: 0 }}>
            <PremiumSection
                icon="📱"
                title="Estratégia de Social Media"
                isEditing={isEditingPost}
                isViewer={isViewer}
                onEdit={() => setIsEditingPost(true)}
            >
                {isEditingPost ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">CRIAÇÃO DO TEXTO (DESCRIÇÃO)</label>
                            <textarea
                                className="input-premium-textarea"
                                rows={6}
                                placeholder="Escreva a legenda sugerida para o post..."
                                value={task.post_criacao_texto || ''}
                                onChange={e => onFieldChange('post_criacao_texto', e.target.value)}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginTop: '0.75rem' }}>
                                <input
                                    type="checkbox"
                                    checked={!!task.post_criacao_corrigido}
                                    onChange={e => onFieldChange('post_criacao_corrigido', e.target.checked)}
                                    style={{ width: 18, height: 18, accentColor: '#3b82f6' }}
                                />
                                Texto de Criação Corrigido
                            </label>
                        </div>

                        <div className="fields-grid-2-premium" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">DATA DA POSTAGEM</label>
                                <input 
                                    type="date" 
                                    className="input-premium" 
                                    value={task.post_data_postagem || ''} 
                                    onChange={e => onFieldChange('post_data_postagem', e.target.value)} 
                                />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">HORÁRIO DA POSTAGEM</label>
                                <input 
                                    type="time" 
                                    className="input-premium time-input-premium" 
                                    value={task.post_horario_postagem || ''} 
                                    onChange={e => onFieldChange('post_horario_postagem', e.target.value)} 
                                />
                            </div>
                        </div>


                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingPost(false))}>
                                Concluir Estratégia
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Legenda do Post</span>
                                {task.post_criacao_corrigido && <span style={{ color: '#10b981' }}>✓ REVISADO</span>}
                            </div>
                            <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{task.post_criacao_texto || 'Nenhum texto definido.'}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Data Prevista</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                                    {task.post_data_postagem ? format(new Date(task.post_data_postagem + 'T12:00:00'), 'dd/MM/yyyy') : 'A definir'}
                                    {task.post_data_postagem && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>({getDayOfWeek(task.post_data_postagem)})</span>}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Horário</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{task.post_horario_postagem || '--:--'}</div>
                            </div>
                        </div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão do Post</h3>
                <CommentSystem 
                    task={task} 
                    tabName="post" 
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
