import React from 'react';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface ReleaseTabProps {
    task: Task;
    isViewer: boolean;
    isEditingRelease: boolean;
    setIsEditingRelease: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const ReleaseTab: React.FC<ReleaseTabProps> = ({
    task,
    isViewer,
    isEditingRelease,
    setIsEditingRelease,
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
                icon="📝"
                title="Produção de Release"
                isEditing={isEditingRelease}
                isViewer={isViewer}
                onEdit={() => setIsEditingRelease(true)}
            >
                {isEditingRelease ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">BRIEFING PARA O TEXTO</label>
                            <textarea 
                                className="input-premium-textarea" 
                                rows={5} 
                                placeholder="Pontos chaves, aspas importantes, dados e informações que devem constar no release..." 
                                value={task.post_criacao_texto || ''} 
                                onChange={e => onFieldChange('post_criacao_texto', e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingRelease(false))}>
                                Concluir Release
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Informações para o Texto</div>
                        <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                            {task.post_criacao_texto || 'Nenhuma informação cadastrada para este release.'}
                        </div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão do Release</h3>
                <CommentSystem 
                    task={task} 
                    tabName="release" 
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
