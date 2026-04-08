import { Shield, Clock, User, HardDrive, Trash2, Plus, Pencil, Search, Activity } from 'lucide-react';
import { useSecurityLogs } from '../hooks/useSecurityLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';

export default function ProfileSecurityLogsTab() {
    const { securityLogs, loading } = useSecurityLogs();
    const [searchUser, setSearchUser] = useState('');

    const getIcon = (type: string) => {
        switch (type) {
            case 'user': return <User size={16} style={{ color: '#3b82f6' }} />;
            case 'job_functions': return <Pencil size={16} style={{ color: '#8b5cf6' }} />;
            case 'secretarias': return <HardDrive size={16} style={{ color: '#f97316' }} />;
            default: return <Shield size={16} style={{ color: '#64748b' }} />;
        }
    };

    const filteredLogs = useMemo(() => {
        if (!searchUser) return securityLogs;
        
        const normalize = (str: string) => 
            str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            
        const query = normalize(searchUser);
        
        return securityLogs.filter(log => 
            normalize(log.user_name || "").includes(query) ||
            normalize(log.details || "").includes(query)
        );
    }, [securityLogs, searchUser]);


    const getActionBadge = (action: string) => {
        switch (action) {
            case 'create': 
                return <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.65rem' }} className="px-2 py-1 rounded-lg font-bold flex items-center gap-1 uppercase tracking-wider"><Plus size={10}/> Criado</span>;
            case 'delete': 
                return <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.65rem' }} className="px-2 py-1 rounded-lg font-bold flex items-center gap-1 uppercase tracking-wider"><Trash2 size={10}/> Removido</span>;
            case 'update': 
                return <span style={{ background: '#eff6ff', color: '#2563eb', fontSize: '0.65rem' }} className="px-2 py-1 rounded-lg font-bold flex items-center gap-1 uppercase tracking-wider"><Pencil size={10}/> Atualizado</span>;
            default: 
                return <span style={{ background: '#f8fafc', color: '#64748b', fontSize: '0.65rem' }} className="px-2 py-1 rounded-lg font-bold uppercase tracking-wider">{action}</span>;
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', color: '#94a3b8' }}>
                <div className="animate-spin mb-4"><Activity size={24} /></div>
                <p>Sincronizando logs de auditoria...</p>
            </div>
        );
    }

    return (
        <div className="profile-security-logs-tab">
            {/* SEÇÃO 01: HISTÓRICO DE AUDITORIA */}
            <div className="modal-section-group-premium">
                <div className="section-header-premium">
                    <span className="section-number-premium">01</span>
                    <h3>Histórico de Atividades</h3>
                </div>
                
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                    Abaixo estão listadas todas as ações administrativas realizadas no sistema. Os logs são registrados em tempo real e não podem ser editados ou removidos.
                </p>

                {/* FILTRO COM AUTOPREENCHIMENTO */}
                <div className="filter-container-premium" style={{ marginBottom: '2rem', position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                            <Search size={18} />
                        </div>
                        <input 
                            type="text"
                            placeholder="Buscar por nome de usuário, cargo ou ação..."
                            className="input-premium"
                            style={{ paddingLeft: '3.5rem', height: '52px', background: '#f8fafc', border: '1.5px solid #e2e8f0' }}
                            value={searchUser}
                            onChange={(e) => setSearchUser(e.target.value)}
                        />
                        {searchUser && (
                            <button 
                                onClick={() => setSearchUser('')}
                                style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', background: 'none', border: 'none', padding: '6px', borderRadius: '8px' }}
                                className="hover:bg-slate-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="logs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredLogs.length === 0 && (
                        <div className="empty-state" style={{ padding: '3rem', textAlign: 'center', border: '2px dashed #e2e8f0', borderRadius: '24px' }}>
                            <Shield size={42} style={{ margin: '0 auto 1rem', color: '#cbd5e1' }} />
                            <p style={{ color: '#94a3b8', fontWeight: 500 }}>Nenhum evento corresponde aos critérios de busca.</p>
                        </div>
                    )}

                    {filteredLogs.map((log) => (
                        <div 
                            key={log.id} 
                            style={{ 
                                padding: '1rem 1.25rem', 
                                background: 'white', 
                                border: '1.5px solid #f1f5f9', 
                                borderRadius: '18px', 
                                display: 'flex', 
                                gap: '1rem', 
                                alignItems: 'flex-start',
                                transition: 'all 0.2s'
                            }}
                            className="log-item-premium"
                        >
                            <div style={{ 
                                padding: '0.75rem', 
                                background: '#f8fafc', 
                                borderRadius: '14px', 
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {getIcon(log.target_type)}
                            </div>
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
                                    <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                                        {log.user_name || 'Sistema'} 
                                        <span style={{ fontWeight: 500, color: '#94a3b8', marginLeft: '6px', fontSize: '0.85rem' }}>
                                            realizou uma ação de {log.target_type === 'user' ? 'usuário' : log.target_type === 'job_functions' ? 'cargo' : 'secretaria'}
                                        </span>
                                    </span>
                                    {getActionBadge(log.action_type)}
                                </div>
                                
                                <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '0.75rem', fontWeight: 600 }}>
                                    {log.details}
                                </p>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Clock size={12} />
                                        {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </span>
                                    <span style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '6px', color: '#64748b' }}>
                                        ID: {log.id.slice(0, 8)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .log-item-premium {
                    position: relative;
                    overflow: hidden;
                }
                .log-item-premium::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    background: #cbd5e1;
                }
                .log-item-premium:hover {
                    border-color: #e2e8f0;
                    transform: translateX(4px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }
            `}} />
        </div>
    );
}
