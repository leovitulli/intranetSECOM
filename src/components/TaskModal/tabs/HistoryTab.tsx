import React from 'react';
import { Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task } from '../../../types/kanban';

interface HistoryTabProps {
    task: Task;
    activityLogs: any[];
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ task, activityLogs }) => {
    
    const getLeadTimeData = () => {
        if (!task.createdAt) return null;
        const start = new Date(task.createdAt).getTime();
        const end = (task.status === 'publicado' || task.status === 'cancelado') && task.archived_at
            ? new Date(task.archived_at).getTime()
            : Date.now();
            
        const diffMs = end - start;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return { diffDays, diffHours, diffMinutes };
    };

    const leadData = getLeadTimeData();

    return (
        <div className="tab-pane active" style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Activity size={16} /> Data de Criação
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                        {task.createdAt ? format(new Date(task.createdAt), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR }) : 'Desconhecida'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                        Criado por: {task.creator || 'Sistema'}
                    </div>
                </div>

                <div style={{ padding: '1.5rem', background: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ color: '#166534', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={16} /> SLA de Produtividade (Lead Time)
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#14532d' }}>
                        {leadData ? (
                            <>
                                {leadData.diffDays > 0 && `${leadData.diffDays} d `}
                                {leadData.diffHours > 0 && `${leadData.diffHours} h `}
                                {leadData.diffMinutes} min
                            </>
                        ) : 'Calculando...'}
                    </div>
                    <div style={{ color: '#166534', fontSize: '0.8rem' }}>
                        Status atual: {task.status.toUpperCase()}
                    </div>
                </div>
            </div>

            <div className="side-title-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '1rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <Activity size={18} /> Histórico Detalhado (Audit Trail)
            </div>

            <div className="activity-list" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activityLogs.filter(log => !log.details.includes('Banco de Dados')).length > 0 ? 
                    activityLogs
                        .filter(log => !log.details.includes('Banco de Dados'))
                        .map((log, idx) => (
                        <div key={log.id} style={{ fontSize: '0.9rem', borderLeft: '3px solid #e2e8f0', paddingLeft: 20, position: 'relative' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: idx === 0 ? '#3b82f6' : '#cbd5e1', position: 'absolute', left: -7.5, top: 4, boxShadow: idx === 0 ? '0 0 0 4px rgba(59,130,246,0.15)' : 'none' }}></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>{log.user_name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>{format(new Date(log.created_at), "dd MMM, HH:mm", { locale: ptBR })}</div>
                            </div>
                            
                            <div style={{ color: '#475569', marginTop: '6px', lineHeight: 1.5, background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                {log.details.includes('Pauta criada via RPC Blindada') ? '🚀 Pauta registrada no sistema' : log.details}
                            </div>
                        </div>
                    )) : (
                    <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}>
                        <Activity size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>Nenhuma atividade significativa registrada.</p>
                    </div>
                )}
            </div>

        </div>
    );
};
