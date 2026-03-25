import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, RotateCcw, Trash2, Activity } from 'lucide-react';
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
    activityLogs,
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
                            <button className="btn-side-action-premium" onClick={() => onArchive((id) => { /* callback from useTaskModal handleArchive */ })}>
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
        </div>
    );
};
