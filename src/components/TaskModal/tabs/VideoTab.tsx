import React from 'react';
import { format } from 'date-fns';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface VideoTabProps {
    task: Task;
    isViewer: boolean;
    isEditingVideo: boolean;
    setIsEditingVideo: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const VideoTab: React.FC<VideoTabProps> = ({
    task,
    isViewer,
    isEditingVideo,
    setIsEditingVideo,
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
                icon="🎬"
                title="Planejamento de Vídeo"
                isEditing={isEditingVideo}
                isViewer={isViewer}
                onEdit={() => setIsEditingVideo(true)}
            >
                {isEditingVideo ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Resumo da Pauta / Briefing de Vídeo</label>
                            <textarea 
                                className="input-premium-textarea" 
                                rows={6} 
                                placeholder="Objetivo do vídeo, roteiro básico..." 
                                value={task.video_briefing || ''} 
                                onChange={e => onFieldChange('video_briefing', e.target.value)} 
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Data Captação</label>
                                <input 
                                    type="date" 
                                    className="input-premium" 
                                    value={task.video_captacao_data ? new Date(task.video_captacao_data).toISOString().split('T')[0] : ''} 
                                    onChange={e => onFieldChange('video_captacao_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} 
                                />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Prazo de Entrega</label>
                                <input 
                                    type="date" 
                                    className="input-premium" 
                                    value={task.video_entrega_data ? new Date(task.video_entrega_data).toISOString().split('T')[0] : ''} 
                                    onChange={e => onFieldChange('video_entrega_data', e.target.value ? new Date(e.target.value + 'T12:00:00') : null)} 
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingVideo(false))}>
                                Concluir Planejamento
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Briefing e Roteiro</div>
                            <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{task.video_briefing || 'Nenhum briefing definido.'}</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1.25rem' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Captação</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                                    {task.video_captacao_data ? format(new Date(task.video_captacao_data), 'dd/MM/yyyy') : 'Não agendado'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Entrega Prevista</div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#dc2626' }}>
                                    {task.video_entrega_data ? format(new Date(task.video_entrega_data), 'dd/MM/yyyy') : 'A definir'}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Vídeo)</h3>
                <CommentSystem 
                    task={task} 
                    tabName="video" 
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
