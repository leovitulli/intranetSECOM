import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Check, X, Search, Filter, Clock, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';

export default function RH() {
    const { user } = useAuth();
    const [ocorrencias, setOcorrencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');

    const isAdmin = user?.role === 'desenvolvedor' || user?.role === 'rh';

    const fetchAllOcorrencias = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('rh_ocorrencias')
            .select('*, users(name, cod_funcional)')
            .order('created_at', { ascending: false });

        if (data && !error) {
            setOcorrencias(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isAdmin) {
            fetchAllOcorrencias();
        }
    }, [isAdmin]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        if (!user) return;
        const { error } = await supabase
            .from('rh_ocorrencias')
            .update({ status: newStatus, aprovado_por: user.name })
            .eq('id', id);

        if (!error) {
            setOcorrencias(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, aprovado_por: user.name } : o));
        } else {
            alert('Erro ao atualizar status.');
        }
    };

    if (!isAdmin) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Acesso Negado. Apenas Gestores e RH.</div>;
    }

    const filtered = ocorrencias.filter(oc => {
        const matchesStatus = statusFilter === 'Todos' || oc.status === statusFilter;
        const term = searchTerm.toLowerCase();
        const userName = oc.users?.name?.toLowerCase() || '';
        const matchesSearch = term === '' || userName.includes(term) || oc.tipo.toLowerCase().includes(term);
        return matchesStatus && matchesSearch;
    });

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#1e293b', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={28} color="#059669" /> Gestão de Recursos Humanos
                    </h1>
                    <p style={{ color: '#64748b', margin: 0 }}>Painel de controle de atestados, faltas e ocorrências.</p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input 
                        type="text" 
                        placeholder="Buscar por colaborador ou tipo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.2rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="#64748b" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}>
                        <option>Todos</option>
                        <option>Pendente</option>
                        <option>Justificado</option>
                        <option>Não Justificado</option>
                    </select>
                </div>
            </div>

            <div style={{ flex: 1, background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Colaborador</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Tipo e Período</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Data</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Justificativa</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Anexo</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Carregando dados...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Nenhuma ocorrência encontrada.</td></tr>
                            ) : (
                                filtered.map(oc => (
                                    <tr key={oc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.9rem' }}>{oc.users?.name || 'Desconhecido'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cód: {oc.users?.cod_funcional || 'Sem código'}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>{oc.tipo}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Turno: {oc.turno}</div>
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155' }}>
                                            {format(new Date(oc.data_ocorrencia + 'T12:00:00'), "dd/MM/yyyy")}
                                        </td>
                                        <td style={{ padding: '1rem', maxWidth: '200px' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={oc.descricao}>
                                                {oc.descricao}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {oc.anexo_url ? (
                                                <a href={oc.anexo_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0ea5e9', textDecoration: 'none', background: '#e0f2fe', padding: '4px 8px', borderRadius: '6px' }}>Abrir Anexo</a>
                                            ) : (
                                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {oc.status === 'Pendente' ? (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '4px 8px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> PENDENTE</span>
                                            ) : oc.status === 'Justificado' ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 8px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}><Check size={12} /> JUSTIFICADO</span>
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '2px' }}>visto por {oc.aprovado_por?.split(' ')[0]}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '4px 8px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><X size={12} /> NÃO JUSTIFICADO</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            {oc.status === 'Pendente' ? (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleUpdateStatus(oc.id, 'Justificado')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Marcar como Justificado"><Check size={16} /></button>
                                                    <button onClick={() => handleUpdateStatus(oc.id, 'Não Justificado')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Marcar como Não Justificado"><X size={16} /></button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => handleUpdateStatus(oc.id, 'Pendente')} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '6px', cursor: 'pointer' }} title="Desfazer e voltar para Pendente"><RotateCcw size={14} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
