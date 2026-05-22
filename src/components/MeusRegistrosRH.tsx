import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { FileText, Plus, Upload, X, Check, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
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
        <div className="bento-card card-full" style={{ background: '#fff' }}>
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
                                <option>Ocorrência</option>
                                <option>Atestado Médico</option>
                                <option>Serviço Externo</option>
                                <option>115</option>
                                <option>Folga de Plantão</option>
                                <option>Home Office</option>
                                <option>Férias</option>
                                <option>Outros</option>
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
                        <select value={autorizadoPor} onChange={e => setAutorizadoPor(e.target.value)} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '1rem', background: '#fff' }}>
                            <option value="">Selecione o gestor...</option>
                            {team.map(member => (
                                <option key={member.id} value={member.name}>{member.name}</option>
                            ))}
                        </select>

                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>DESCRIÇÃO / JUSTIFICATIVA</label>
                        <textarea value={descricao} onChange={e => setDescricao(e.target.value)} required rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', resize: 'vertical' }} />
                    </div>
                    <button disabled={isSubmitting} type="submit" style={{ alignSelf: 'flex-end', background: '#059669', color: '#fff', border: 'none', padding: '0.75rem 2rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
                        {isSubmitting ? 'Enviando...' : 'Enviar ao RH'}
                    </button>
                </form>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
