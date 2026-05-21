import React from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { Task } from '../../../types/kanban';

interface TaskModalSidebarProps {
    task: Task;
    isViewer: boolean;
    user: any;
    activityLogs: any[];
    onUnarchive: (id: string) => Promise<void>;
    onArchive: (callback: (id: string) => void) => void;
    onClose: () => void;
    onDelete: () => void;
    onFieldChange: (field: keyof Task, value: any) => void;
}

export const TaskModalSidebar: React.FC<TaskModalSidebarProps> = ({
    task,
    isViewer,
    user,
    activityLogs: _activityLogs,
    onUnarchive,
    onArchive,
    onClose,
    onDelete,
    onFieldChange
}) => {
    return (
        <div className="modal-side-col-premium">
            <div className="side-section-premium">
                <div className="side-title-premium" style={{ color: '#64748b' }}>STATUS DA PAUTA</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className={`status-badge-premium ${task.status}`} style={{ width: '100%', padding: 8, fontSize: '0.8rem', fontWeight: 800, textAlign: 'center', borderRadius: 10 }}>
                        {task.status.toUpperCase()}
                    </div>
                    <select
                        className="select-premium"
                        style={{ width: '100%', padding: 8, borderRadius: 10, fontSize: '0.85rem', fontWeight: 600 }}
                        value={task.status}
                        onChange={e => onFieldChange('status', e.target.value)}
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
                        task.archived ? (
                            <button className="btn-side-action-premium" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0' }} onClick={async () => { await onUnarchive(task.id); onClose(); }}>
                                <RotateCcw size={16} /> Reativar Pauta
                            </button>
                        ) : (
                            <button className="btn-side-action-premium" onClick={() => onArchive(() => { /* callback from useTaskModal handleArchive */ })}>
                                <Archive size={16} /> Arquivar Pauta
                            </button>
                        )
                    )}
                    {(user?.role === 'admin' || user?.role === 'desenvolvedor') && (
                        <button className="btn-side-action-premium danger" style={{ marginTop: '0.5rem' }} onClick={onDelete}>
                            <Trash2 size={16} /> Excluir Pauta
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
};
