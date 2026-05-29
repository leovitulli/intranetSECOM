import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Check, X, Search, Filter, Clock, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeText } from '../utils/searchUtils';

export default function RH() {
    const { user } = useAuth();
    const [ocorrencias, setOcorrencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('Todos');
    
    // Período selecionado (Mês/Ano) - inicia no mês atual
    const [currentPeriod, setCurrentPeriod] = useState(() => {
        const now = new Date();
        return {
            month: now.getMonth(), // 0-11
            year: now.getFullYear()
        };
    });

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

    const handleUpdateStatus = useCallback(async (id: string, newStatus: string) => {
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
    }, [user]);

    const handlePrevPeriod = useCallback(() => {
        setCurrentPeriod(prev => {
            let nextMonth = prev.month - 1;
            let nextYear = prev.year;
            if (nextMonth < 0) {
                nextMonth = 11;
                nextYear -= 1;
            }
            return { month: nextMonth, year: nextYear };
        });
    }, []);

    const handleNextPeriod = useCallback(() => {
        setCurrentPeriod(prev => {
            let nextMonth = prev.month + 1;
            let nextYear = prev.year;
            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear += 1;
            }
            return { month: nextMonth, year: nextYear };
        });
    }, []);

    if (!isAdmin) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Acesso Negado. Apenas Gestores e RH.</div>;
    }

    const filtered = useMemo(() => {
        return ocorrencias.filter(oc => {
            const matchesStatus = statusFilter === 'Todos' || oc.status === statusFilter;
            
            const term = normalizeText(searchTerm);
            
            // Se houver busca ativa, nós procuramos em todo o histórico (ignora filtro de mês/ano).
            // Se a busca estiver vazia, filtramos estritamente pelo período selecionado no carrossel.
            let matchesPeriod = true;
            if (term === '') {
                if (!oc.data_ocorrencia) return false;
                const [year, month] = oc.data_ocorrencia.split('-');
                matchesPeriod = parseInt(year) === currentPeriod.year && (parseInt(month) - 1) === currentPeriod.month;
            }

            // Dados textuais para a busca
            const userName = normalizeText(oc.users?.name || '');
            const codFuncional = normalizeText(oc.users?.cod_funcional || '');
            const tipo = normalizeText(oc.tipo || '');
            const turno = normalizeText(oc.turno || '');
            const descricao = normalizeText(oc.descricao || '');
            const status = normalizeText(oc.status || '');
            
            // Formatar datas para busca flexível (ex: "23/05/2026" ou "23 de maio")
            const formattedDateRaw = oc.data_ocorrencia ? new Date(oc.data_ocorrencia + 'T12:00:00') : null;
            const formattedDateStr1 = formattedDateRaw ? format(formattedDateRaw, "dd/MM/yyyy") : '';
            const formattedDateStr2 = formattedDateRaw ? format(formattedDateRaw, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '';
            const dateSearchText = normalizeText(formattedDateStr1 + ' ' + formattedDateStr2);

            const matchesSearch = term === '' || 
                userName.includes(term) || 
                codFuncional.includes(term) || 
                tipo.includes(term) || 
                turno.includes(term) || 
                descricao.includes(term) || 
                status.includes(term) || 
                dateSearchText.includes(term);
            
            return matchesStatus && matchesSearch && matchesPeriod;
        });
    }, [ocorrencias, statusFilter, searchTerm, currentPeriod]);

    // Formatar o nome do mês para exibição
    const periodDate = new Date(currentPeriod.year, currentPeriod.month, 15);
    const periodLabel = format(periodDate, "MMMM yyyy", { locale: ptBR });
    const capitalizedPeriodLabel = periodLabel.charAt(0).toUpperCase() + periodLabel.slice(1);

    return (
        <div className="dashboard-container dashboard-v3-root" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            <div className="page-header dashboard-header-premium glass" style={{ marginBottom: '0.5rem' }}>
                <div>
                    <h1 className="title text-gradient">Recursos Humanos</h1>
                    <p className="subtitle">Painel de controle de atestados, faltas e ocorrências.</p>
                </div>
            </div>

            {/* Carrossel Seletor de Período Mensal */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '2.5rem', 
                    background: '#fff', 
                    padding: '0.6rem 1.75rem', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03)'
                }}>
                    <button 
                        onClick={handlePrevPeriod} 
                        style={{ 
                            background: '#fff', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px', 
                            width: '38px', 
                            height: '38px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            color: '#1e293b',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', minWidth: '150px', textAlign: 'center', letterSpacing: '-0.02em' }}>
                        {capitalizedPeriodLabel}
                    </span>
                    
                    <button 
                        onClick={handleNextPeriod} 
                        style={{ 
                            background: '#fff', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '12px', 
                            width: '38px', 
                            height: '38px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            color: '#1e293b',
                            transition: 'all 0.2s',
                            outline: 'none'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f8fafc';
                            e.currentTarget.style.borderColor = '#cbd5e1';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#fff';
                            e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                    >
                        <ChevronRight size={18} />
                    </button>
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

            {loading ? (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                    Carregando dados...
                </div>
            ) : filtered.length === 0 ? (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8' }}>
                    <FileText size={40} color="#cbd5e1" style={{ marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 500 }}>Nenhum registro encontrado em <b>{capitalizedPeriodLabel}</b>.</p>
                </div>
            ) : (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
                                {filtered.map(oc => (
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
                                        <td style={{ padding: '1rem', maxWidth: '250px' }}>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
