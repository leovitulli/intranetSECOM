import React from 'react';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface FotoTabProps {
    task: Task;
    isViewer: boolean;
    isEditingFoto: boolean;
    setIsEditingFoto: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const FotoTab: React.FC<FotoTabProps> = ({
    task,
    isViewer,
    isEditingFoto,
    setIsEditingFoto,
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
                icon="📸"
                title="Produção de Fotografia"
                isEditing={isEditingFoto}
                isViewer={isViewer}
                onEdit={() => setIsEditingFoto(true)}
            >
                {isEditingFoto ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">BRIEFING DE FOTOGRAFIA</label>
                            <textarea 
                                className="input-premium-textarea" 
                                rows={4} 
                                placeholder="Descreva o que deve ser fotografado, estilo das fotos, momentos essenciais..." 
                                value={task.foto_briefing || ''} 
                                onChange={e => onFieldChange('foto_briefing', e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingFoto(false))}>
                                Concluir Fotografia
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Diretrizes Fotográficas</div>
                        <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{task.foto_briefing || 'Nenhum briefing definido para fotografia.'}</div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Foto)</h3>
                <CommentSystem 
                    task={task} 
                    tabName="foto" 
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
