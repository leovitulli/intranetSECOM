import React from 'react';
import { PremiumSection } from '../components/PremiumSection';
import { CommentSystem } from '../components/CommentSystem';
import type { Task } from '../../../types/kanban';

interface ArteTabProps {
    task: Task;
    isViewer: boolean;
    isEditingArte: boolean;
    setIsEditingArte: (v: boolean) => void;
    onFieldChange: (field: keyof Task, value: any) => void;
    onSaveSection: (callback: () => void) => void;
    // Comment Props
    user: any;
    newComment: string;
    setNewComment: (v: string) => void;
    handleAddComment: (e: React.FormEvent) => void;
}

export const ArteTab: React.FC<ArteTabProps> = ({
    task,
    isViewer,
    isEditingArte,
    setIsEditingArte,
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
                icon="🎨"
                title="Solicitação de Peças Gráficas"
                isEditing={isEditingArte}
                isViewer={isViewer}
                onEdit={() => setIsEditingArte(true)}
            >
                {isEditingArte ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">QUAIS PEÇAS SÃO NECESSÁRIAS?</label>
                            <textarea 
                                className="input-premium-textarea" 
                                rows={4} 
                                placeholder="Ex: Card para Instagram, Banner para site, Cartaz A3..." 
                                value={task.arte_pecas || ''} 
                                onChange={e => onFieldChange('arte_pecas', e.target.value)} 
                            />
                        </div>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">INFORMAÇÕES RELEVANTES / TEXTO DA ARTE</label>
                            <textarea 
                                className="input-premium-textarea" 
                                rows={4} 
                                placeholder="Conteúdo textual que deve constar na arte..." 
                                value={task.arte_informacoes || ''} 
                                onChange={e => onFieldChange('arte_informacoes', e.target.value)} 
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button className="btn-primary small" onClick={() => onSaveSection(() => setIsEditingArte(false))}>
                                Concluir Pedido
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Peças Solicitadas</div>
                            <div style={{ fontSize: '0.95rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>{task.arte_pecas || 'Nenhuma peça descrita.'}</div>
                        </div>
                        <div style={{ background: 'white', padding: '1.25rem', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Conteúdo para a Arte</div>
                            <div style={{ fontSize: '0.9rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{task.arte_informacoes || 'Sem informações adicionais.'}</div>
                        </div>
                    </div>
                )}
            </PremiumSection>

            <section className="modal-section-group-premium">
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b', marginBottom: '1.5rem' }}>Discussão da Produção (Arte)</h3>
                <CommentSystem 
                    task={task} 
                    tabName="arte" 
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
