import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { FileText, Plus, Upload, X, Check, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizeText } from '../utils/searchUtils';

export default function MeusRegistrosRH() {
    const { user } = useAuth();
    const { team } = useData();
    const [ocorrencias, setOcorrencias] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    
    // Form States
    const [tipo, setTipo] = useState('Ocorrência');
    const [turno, setTurno] = useState('Manhã');
    const [dataOcorrencia, setDataOcorrencia] = useState('');
    const [descricao, setDescricao] = useState('');
    const [autorizadoPor, setAutorizadoPor] = useState('');
    const [anexoFile, setAnexoFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isGestorDropdownOpen, setIsGestorDropdownOpen] = useState(false);
    const gestorDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (gestorDropdownRef.current && !gestorDropdownRef.current.contains(event.target as Node)) {
                setIsGestorDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const hasIncompleteProfile = !user?.birth_date || !(user as any)?.cod_funcional;

    const fetchOcorrencias = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('rh_ocorrencias')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data && !error) {
            setOcorrencias(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOcorrencias();
    }, [user]);

    const quotas = React.useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0-11

        let monthOccurrencesCount = 0;
        let year115Count = 0;
        let month115Count = 0;

        ocorrencias.forEach(oc => {
            if (!oc.data_ocorrencia) return;
            const date = new Date(oc.data_ocorrencia + 'T12:00:00');
            const ocYear = date.getFullYear();
            const ocMonth = date.getMonth();

            const isOcorrencia = oc.tipo?.toLowerCase() === 'ocorrência' || oc.tipo?.toLowerCase() === 'ocorrencia';
            const is115 = oc.tipo === '115';

            if (isOcorrencia && ocYear === currentYear && ocMonth === currentMonth) {
                monthOccurrencesCount++;
            }

            if (is115 && ocYear === currentYear) {
                year115Count++;
                if (ocMonth === currentMonth) {
                    month115Count++;
                }
            }
        });

        return {
            occurrences: monthOccurrencesCount,
            occurrencesLimit: 3,
            occurrencesPercent: Math.min((monthOccurrencesCount / 3) * 100, 100),
            records115: year115Count,
            records115Limit: 8,
            records115Percent: Math.min((year115Count / 8) * 100, 100),
            month115: month115Count,
        };
    }, [ocorrencias]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // Validação estrita de cotas
        const isOcorr = tipo?.toLowerCase() === 'ocorrência' || tipo?.toLowerCase() === 'ocorrencia';
        const is115 = tipo === '115';

        if (isOcorr && quotas.occurrences >= quotas.occurrencesLimit && !editingId) {
            alert('❌ Erro: Limite máximo de 3 ocorrências por mês atingido.');
            return;
        }

        if (is115 && !editingId) {
            if (quotas.month115 >= 1) {
                alert('❌ Erro: Limite máximo de 1 registro "115" por mês atingido.');
                return;
            }
            if (quotas.records115 >= quotas.records115Limit) {
                alert('❌ Erro: Limite máximo de 8 registros "115" por ano atingido.');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            let anexoUrl = null;

            // 1. Upload do Anexo se existir
            if (anexoFile) {
                const fileExt = anexoFile.name.split('.').pop();
                const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('anexos')
                    .upload(`rh/${fileName}`, anexoFile);

                if (!uploadError && uploadData) {
                    const { data: publicUrlData } = supabase.storage
                        .from('anexos')
                        .getPublicUrl(`rh/${fileName}`);
                    anexoUrl = publicUrlData.publicUrl;
                }
            }

            // 2. Inserir no Banco
            const finalDescricao = autorizadoPor.trim() ? `[Autorizado por: ${autorizadoPor.trim()}]\n\n${descricao}` : descricao;

            let error;

            if (editingId) {
                // Update
                const updateData: any = {
                    tipo,
                    turno,
                    data_ocorrencia: dataOcorrencia,
                    descricao: finalDescricao,
                    status: 'Pendente' // reseta o status ao editar
                };
                if (anexoUrl) updateData.anexo_url = anexoUrl;

                const { error: updErr } = await supabase.from('rh_ocorrencias').update(updateData).eq('id', editingId);
                error = updErr;
            } else {
                // Insert
                const { error: insErr } = await supabase.from('rh_ocorrencias').insert([{
                    user_id: user.id,
                    tipo,
                    turno,
                    data_ocorrencia: dataOcorrencia,
                    descricao: finalDescricao,
                    anexo_url: anexoUrl,
                    status: 'Pendente'
                }]);
                error = insErr;
            }

            if (!error) {
                setIsFormOpen(false);
                setEditingId(null);
                setTipo('Ocorrência');
                setTurno('Manhã');
                setDataOcorrencia('');
                setDescricao('');
                setAutorizadoPor('');
                setAnexoFile(null);
                fetchOcorrencias();
            } else {
                alert('Erro ao enviar declaração.');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja apagar este registro?')) return;
        setLoading(true);
        const { error } = await supabase.from('rh_ocorrencias').delete().eq('id', id);
        if (!error) fetchOcorrencias();
        else {
            alert('Erro ao apagar registro.');
            setLoading(false);
        }
    };

    const handleEdit = (oc: any) => {
        setEditingId(oc.id);
        setTipo(oc.tipo);
        setTurno(oc.turno);
        setDataOcorrencia(oc.data_ocorrencia);
        
        let parsedAutorizado = '';
        let parsedDescricao = oc.descricao || '';
        if (parsedDescricao.startsWith('[Autorizado por: ')) {
            const endBracketIndex = parsedDescricao.indexOf(']');
            if (endBracketIndex !== -1) {
                parsedAutorizado = parsedDescricao.substring('[Autorizado por: '.length, endBracketIndex);
                parsedDescricao = parsedDescricao.substring(endBracketIndex + 1).replace(/^\n+/, '');
            }
        }
        setAutorizadoPor(parsedAutorizado);
        setDescricao(parsedDescricao);
        setIsFormOpen(true);
    };

    return (
        <div className="bento-card card-wide" style={{ background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                    <FileText size={18} color="#059669" /> Meus Registros de RH
                </h3>
                {!hasIncompleteProfile && (
                    <button 
                        onClick={() => {
                            if (isFormOpen) {
                                setIsFormOpen(false);
                                setEditingId(null);
                                setTipo('Ocorrência');
                                setTurno('Manhã');
                                setDataOcorrencia('');
                                setDescricao('');
                                setAutorizadoPor('');
                                setAnexoFile(null);
                            } else {
                                setIsFormOpen(true);
                                // Seleção inteligente de default dependendo do limite
                                if (quotas.occurrences >= 3) {
                                    setTipo('Atestado Médico');
                                } else {
                                    setTipo('Ocorrência');
                                }
                            }
                        }}
                        style={{ 
                            background: isFormOpen ? '#f1f5f9' : '#059669', 
                            color: isFormOpen ? '#475569' : '#fff', 
                            border: 'none', padding: '6px 14px', borderRadius: '8px', 
                            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                        }}
                    >
                        {isFormOpen ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nova Declaração</>}
                    </button>
                )}
            </div>

            {/* Widget de Cotas de Ocorrências e 115 */}
            {!hasIncompleteProfile && (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1rem', 
                    background: '#f8fafc', 
                    padding: '1rem', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    marginBottom: '1.25rem' 
                }}>
                    {/* Cota Ocorrências do Mês */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                Ocorrências no Mês (Máx 3)
                            </span>
                            <span style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 800, 
                                color: quotas.occurrences >= quotas.occurrencesLimit ? '#ef4444' : quotas.occurrences === 2 ? '#f59e0b' : '#059669' 
                            }}>
                                {quotas.occurrences} de {quotas.occurrencesLimit}
                            </span>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${quotas.occurrencesPercent}%`, 
                                height: '100%', 
                                background: quotas.occurrences >= quotas.occurrencesLimit ? 'linear-gradient(90deg, #f87171, #ef4444)' : quotas.occurrences === 2 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #34d399, #059669)',
                                borderRadius: '99px',
                                transition: 'width 0.4s ease-out'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: quotas.occurrences >= quotas.occurrencesLimit ? '#ef4444' : '#64748b', fontWeight: quotas.occurrences >= quotas.occurrencesLimit ? 700 : 500 }}>
                            {quotas.occurrences >= quotas.occurrencesLimit ? '❌ Limite mensal atingido! Não é possível enviar novas ocorrências.' : `Restam ${quotas.occurrencesLimit - quotas.occurrences} ocorrências permitidas este mês.`}
                        </span>
                    </div>

                    {/* Cota 115 do Ano */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                                Registros "115" no Ano (Máx 8 / Limite 1 por mês)
                            </span>
                            <span style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 800, 
                                color: quotas.month115 >= 1 || quotas.records115 >= quotas.records115Limit ? '#ef4444' : quotas.records115 >= 6 ? '#f59e0b' : '#0284c7' 
                            }}>
                                {quotas.records115} de {quotas.records115Limit}
                            </span>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
                            <div style={{ 
                                width: `${quotas.records115Percent}%`, 
                                height: '100%', 
                                background: quotas.month115 >= 1 || quotas.records115 >= quotas.records115Limit ? 'linear-gradient(90deg, #f87171, #ef4444)' : quotas.records115 >= 6 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #38bdf8, #0284c7)',
                                borderRadius: '99px',
                                transition: 'width 0.4s ease-out'
                            }} />
                        </div>
                        <span style={{ fontSize: '0.65rem', color: (quotas.month115 >= 1 || quotas.records115 >= quotas.records115Limit) ? '#ef4444' : '#64748b', fontWeight: (quotas.month115 >= 1 || quotas.records115 >= quotas.records115Limit) ? 700 : 500 }}>
                            {quotas.month115 >= 1 ? '❌ Limite mensal atingido! Apenas 1 registro "115" por mês é permitido.' : quotas.records115 >= quotas.records115Limit ? '❌ Limite anual atingido! Máximo de 8 registros "115" por ano.' : `Disponível este mês (Cota: ${quotas.month115}/1 | Restam ${quotas.records115Limit - quotas.records115} no ano)`}
                        </span>
                    </div>
                </div>
            )}

            {hasIncompleteProfile ? (
                <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <AlertCircle size={24} color="#d97706" style={{ flexShrink: 0 }} />
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', color: '#92400e', fontWeight: 700, fontSize: '0.95rem' }}>Ação Necessária: Perfil Incompleto</h4>
                        <p style={{ margin: 0, color: '#b45309', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            Para enviar atestados e ocorrências ao RH, você precisa ter a <b>Data de Nascimento</b> e o <b>Código Funcional</b> preenchidos no seu Perfil.
                            Volte ao topo da página e clique em Editar Perfil.
                        </p>
                    </div>
                </div>
            ) : isFormOpen ? (
                <form onSubmit={handleSubmit} style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>TIPO DE OCORRÊNCIA</label>
                            <select value={tipo} onChange={e => setTipo(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                                <option disabled={quotas.occurrences >= 3 && !editingId} value="Ocorrência">
                                    Ocorrência {quotas.occurrences >= 3 && !editingId ? '(Bloqueado: Limite 3/mês atingido)' : ''}
                                </option>
                                <option value="Atestado Médico">Atestado Médico</option>
                                <option value="Serviço Externo">Serviço Externo</option>
                                <option disabled={(quotas.month115 >= 1 || quotas.records115 >= 8) && !editingId} value="115">
                                    115 {quotas.month115 >= 1 && !editingId ? '(Bloqueado: Limite 1/mês atingido)' : quotas.records115 >= 8 && !editingId ? '(Bloqueado: Limite 8/ano atingido)' : ''}
                                </option>
                                <option value="Folga de Plantão">Folga de Plantão</option>
                                <option value="Home Office">Home Office</option>
                                <option value="Férias">Férias</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>TURNO</label>
                            <select value={turno} onChange={e => setTurno(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                                <option>Manhã</option>
                                <option>Tarde</option>
                                <option>Noite</option>
                                <option>Integral</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DATA DO FATO</label>
                            <input type="date" value={dataOcorrencia} onChange={e => setDataOcorrencia(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>ANEXO (OPCIONAL)</label>
                            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#fff', fontSize: '0.9rem', cursor: 'pointer', color: '#475569' }}>
                                <Upload size={16} /> {anexoFile ? anexoFile.name : 'Anexar Atestado/Doc'}
                                <input type="file" style={{ display: 'none' }} onChange={e => setAnexoFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
                            </label>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>AUTORIZADO POR (NOME DO GESTOR)</label>
                        <div style={{ position: 'relative', marginBottom: '1rem' }} ref={gestorDropdownRef}>
                            <input 
                                type="text"
                                placeholder="Digite para buscar o gestor..."
                                value={autorizadoPor}
                                onChange={e => {
                                    setAutorizadoPor(e.target.value);
                                    setIsGestorDropdownOpen(true);
                                }}
                                onFocus={() => setIsGestorDropdownOpen(true)}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#fff' }}
                            />
                            {isGestorDropdownOpen && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#fff',
                                    border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                    maxHeight: '200px', overflowY: 'auto', zIndex: 50
                                }}>
                                    {team
                                        .filter(member => normalizeText(member.name).includes(normalizeText(autorizadoPor)))
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(member => (
                                            <div 
                                                key={member.id}
                                                onClick={() => {
                                                    setAutorizadoPor(member.name);
                                                    setIsGestorDropdownOpen(false);
                                                }}
                                                style={{ padding: '0.75rem 1rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: member.color || '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                                                    {member.avatar_url ? (
                                                        <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                    ) : (
                                                        member.name.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 500 }}>{member.name}</span>
                                            </div>
                                        ))
                                    }
                                    {team.filter(member => normalizeText(member.name).includes(normalizeText(autorizadoPor))).length === 0 && (
                                        <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                            Nenhum colaborador encontrado.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DESCRIÇÃO / JUSTIFICATIVA</label>
                        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} required rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }} />
                    </div>
                    <button disabled={isSubmitting} type="submit" style={{ alignSelf: 'flex-end', background: '#059669', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                        {isSubmitting ? 'Enviando...' : 'Enviar ao RH'}
                    </button>
                </form>
            ) : (
                <div className="scrollable-list">
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Carregando...</div>
                    ) : ocorrencias.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                            Nenhum registro enviado ainda.
                        </div>
                    ) : (
                        ocorrencias.map(oc => (
                            <div key={oc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #f1f5f9', borderRadius: '12px', background: '#f8fafc' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#1e293b', fontWeight: 700 }}>{oc.tipo}</h4>
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: '#64748b', alignItems: 'center' }}>
                                        <span>📅 {format(new Date(oc.data_ocorrencia + 'T12:00:00'), "dd 'de' MMM", { locale: ptBR })}</span>
                                        <span>•</span>
                                        <span>🕒 {oc.turno}</span>
                                        {oc.anexo_url && (
                                            <>
                                                <span>•</span>
                                                <a href={oc.anexo_url} target="_blank" rel="noreferrer" style={{ color: '#0ea5e9', textDecoration: 'none', fontWeight: 600 }}>📎 Ver Anexo</a>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {oc.status === 'Pendente' ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '4px 10px', borderRadius: '99px' }}><Clock size={12} /> PENDENTE</span>
                                    ) : oc.status === 'Justificado' ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', padding: '4px 10px', borderRadius: '99px' }}><Check size={12} /> JUSTIFICADO</span>
                                            {oc.aprovado_por && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>visto por {oc.aprovado_por.split(' ')[0]}</span>}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', padding: '4px 10px', borderRadius: '99px' }}><X size={12} /> NÃO JUSTIFICADO</span>
                                            {oc.aprovado_por && <span style={{ fontSize: '0.65rem', color: '#64748b' }}>visto por {oc.aprovado_por.split(' ')[0]}</span>}
                                        </div>
                                    )}

                                    {/* Action buttons only visible to the user who created it (which is this user) */}
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={() => handleEdit(oc)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }} title="Editar"><Pencil size={14}/></button>
                                        <button onClick={() => handleDelete(oc.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }} title="Apagar"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
