import { useState } from 'react';
import type { Task, TaskType, TaskPriority, InaugurationTipo, InaugurationChecklistItem } from '../types/kanban';
import { X, Plus, MapPin, Building2 } from 'lucide-react';
import './CreateTaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';
import TeamMultiSelect from './TeamMultiSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (task: Task) => Promise<boolean>;
}

export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
    const { user } = useAuth();
    const { tasks } = useData();
    const uniqueAddresses = Array.from(new Set(tasks.map((t: Task) => t.pauta_endereco).filter(Boolean)));
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [types, setTypes] = useState<TaskType[]>(['release']);
    const [priority, setPriority] = useState<TaskPriority>('media');
    const [assignees, setAssignees] = useState<string[]>([]);
    const [secretarias, setSecretarias] = useState<string[]>([]);
    const [creators, setCreators] = useState<string[]>(user?.name ? [user.name] : []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'geral' | 'release' | 'post' | 'video' | 'foto' | 'arte' | 'inauguracao'>('geral');
    const [presencaPrefeito, setPresencaPrefeito] = useState(false);

    // Inauguração fields
    const [inaugTipo, setInaugTipo] = useState<InaugurationTipo>('simples');
    const [inaugChecklist, setInaugChecklist] = useState<InaugurationChecklistItem[]>([
        { id: 'placa', label: 'Placa de inauguração', done: false },
        { id: 'backdrop', label: 'Backdrop', done: false },
    ]);

    const DEFAULT_CHECKLIST_SIMPLES: InaugurationChecklistItem[] = [
        { id: 'placa', label: 'Placa de inauguração', done: false },
        { id: 'backdrop', label: 'Backdrop', done: false },
    ];
    const DEFAULT_CHECKLIST_MASTER: InaugurationChecklistItem[] = [
        { id: 'placa', label: 'Placa de inauguração', done: false },
        { id: 'backdrops', label: 'Backdrops / banners', done: false },
        { id: 'telao', label: '1 Telão', done: false },
        { id: 'video_telao', label: 'Vídeo para telão', done: false },
    ];

    const handleInaugTipoChange = (tipo: InaugurationTipo) => {
        setInaugTipo(tipo);
        setInaugChecklist(tipo === 'master' ? DEFAULT_CHECKLIST_MASTER : DEFAULT_CHECKLIST_SIMPLES);
    };

    // Form fields
    const [pautaData, setPautaData] = useState('');
    const [pautaHorarioStart, setPautaHorarioStart] = useState('');
    const [pautaHorarioEnd, setPautaHorarioEnd] = useState('');
    const [pautaSaida, setPautaSaida] = useState('');
    const [pautaEndereco, setPautaEndereco] = useState('');
    const [isPautaExterna, setIsPautaExterna] = useState(false);

    // Video production fields
    const [videoCaptacaoEquipe, setVideoCaptacaoEquipe] = useState<string[]>([]);
    const [videoCaptacaoData, setVideoCaptacaoData] = useState('');
    const [videoEdicaoEquipe, setVideoEdicaoEquipe] = useState<string[]>([]);
    const [videoEdicaoData, setVideoEdicaoData] = useState('');
    const [videoBriefing, setVideoBriefing] = useState('');
    const [videoNecessidades, setVideoNecessidades] = useState<string[]>([]);
    const [videoEntregaData, setVideoEntregaData] = useState('');
    
    // Arte Tab States
    const [arteTipoPecas, setArteTipoPecas] = useState('');
    const [arteEntregaData, setArteEntregaData] = useState('');

    // Post Tab States
    const [postCriacaoTexto, setPostCriacaoTexto] = useState('');
    const [postCriacaoCorrigido, setPostCriacaoCorrigido] = useState(false);
    const [postAprovado, setPostAprovado] = useState(false);
    const [postAlteradoTexto, setPostAlteradoTexto] = useState('');
    const [postReprovado, setPostReprovado] = useState(false);
    const [postReprovadoComentario, setPostReprovadoComentario] = useState('');


    const getDayOfWeek = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr + 'T12:00:00');
            return format(date, "EEEE", { locale: ptBR });
        } catch (e) {
            return '';
        }
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);
        try {
            // Inauguração logic: if inaug tab was filled, add type and set status
            const isInauguracao = inaugChecklist.some(item => item.done) || inaugTipo === 'master';
            const finalTypes = isInauguracao && !types.includes('inauguracao')
                ? [...types, 'inauguracao' as TaskType]
                : types;
            const finalStatus = isInauguracao ? 'inauguracao' : 'solicitado';

            const newTask: Task = {
                id: crypto.randomUUID(),
                title,
                description: description || '',
                status: finalStatus,
                type: finalTypes,
                creator: creators.length > 0 ? creators.join(', ') : (user?.name || 'Sistema'),
                priority,
                assignees,
                dueDate: pautaData ? new Date(pautaData) : null,
                createdAt: new Date(),
                comments: [],
                attachments: [],
                inauguracao_nome: isInauguracao ? title : undefined,
                inauguracao_endereco: pautaEndereco,
                inauguracao_secretarias: secretarias,
                inauguracao_tipo: isInauguracao ? inaugTipo : undefined,
                inauguracao_checklist: isInauguracao ? inaugChecklist : undefined,
                inauguracao_data: pautaData ? new Date(pautaData) : undefined,
                pauta_data: pautaData,
                pauta_horario: (pautaHorarioStart && pautaHorarioEnd) ? `${pautaHorarioStart} às ${pautaHorarioEnd}` : (pautaHorarioStart || pautaHorarioEnd || ''),
                pauta_saida: pautaSaida,
                pauta_endereco: pautaEndereco,
                is_pauta_externa: isPautaExterna,
                // Video production data
                video_captacao_equipe: videoCaptacaoEquipe.length > 0 ? videoCaptacaoEquipe : undefined,
                video_captacao_data: videoCaptacaoData ? new Date(videoCaptacaoData) : undefined,
                video_edicao_equipe: videoEdicaoEquipe.length > 0 ? videoEdicaoEquipe : undefined,
                video_edicao_data: videoEdicaoData ? new Date(videoEdicaoData) : undefined,
                video_briefing: videoBriefing || undefined,
                video_necessidades: videoNecessidades.length > 0 ? videoNecessidades : undefined,
                video_entrega_data: videoEntregaData ? new Date(videoEntregaData) : undefined,
                arte_tipo_pecas: arteTipoPecas || undefined,
                arte_entrega_data: arteEntregaData ? new Date(arteEntregaData) : undefined,
                // Post production data
                post_criacao_texto: postCriacaoTexto || undefined,
                post_criacao_corrigido: postCriacaoCorrigido,
                post_aprovado: postAprovado,
                post_alterado_texto: postAlteradoTexto || undefined,
                post_reprovado: postReprovado,
            post_reprovado_comentario: postReprovadoComentario,
            post_material_solicitado: types.map(t => {
                if (t === 'video') return 'Vídeo';
                if (t === 'foto') return 'Foto';
                return t.charAt(0).toUpperCase() + t.slice(1);
            })
        };

            const success = await onCreate(newTask);
            if (success) {
                onClose();
            }
        } catch (error) {
            console.error("Erro ao criar pauta: ", error);
            alert("Erro ao criar pauta. Verifique sua conexão.");
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className="modal-overlay">
            <div className="modal-content nova-pauta-modal" onClick={e => e.stopPropagation()}>
                <div className="nova-pauta-header-premium">
                    <div className="header-left-premium">
                        <div className="header-icon-premium">
                            <Plus size={20} />
                        </div>
                        <div className="header-titles-premium">
                            <span className="header-subtitle-premium">Preencha os detalhes para criar um novo registro</span>
                            <h2>Nova Pauta</h2>
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="nova-pauta-body-premium" noValidate>
                    {/* --- Barra de Abas --- */}
                    <div className="tabs-bar-premium">
                        <button type="button" className={`tab-btn-premium ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>Geral</button>
                        <button type="button" data-tab="release" className={`tab-btn-premium ${activeTab === 'release' ? 'active' : ''}`} onClick={() => setActiveTab('release')}>📝 Release</button>
                        <button type="button" data-tab="post" className={`tab-btn-premium ${activeTab === 'post' ? 'active' : ''}`} onClick={() => setActiveTab('post')}>📱 Post</button>
                        <button type="button" data-tab="video" className={`tab-btn-premium ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>🎬 Vídeo</button>
                        <button type="button" data-tab="foto" className={`tab-btn-premium ${activeTab === 'foto' ? 'active' : ''}`} onClick={() => setActiveTab('foto')}>📸 Foto</button>
                        <button type="button" data-tab="arte" className={`tab-btn-premium ${activeTab === 'arte' ? 'active' : ''}`} onClick={() => setActiveTab('arte')}>🎨 Arte</button>
                        <button type="button" data-tab="inauguracao" className={`tab-btn-premium ${activeTab === 'inauguracao' ? 'active' : ''}`} onClick={() => setActiveTab('inauguracao')}>🏛️ Inauguração</button>
                    </div>

                    {activeTab === 'geral' && (<>
                    {/* --- Seção 1: Informações Principais --- */}
                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">01</span>
                            <h3>Informações da Pauta</h3>
                        </div>
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Título da Pauta</label>
                            <input
                                type="text"
                                className="input-premium title-input-premium"
                                placeholder="Ex: Inauguração da Nova Praça Central"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Descrição / Briefing</label>
                            <textarea
                                className="input-premium-textarea"
                                rows={3}
                                placeholder="Descreva os detalhes importantes, objetivos e observações da pauta..."
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* --- Seção 2: Agendamento e Local --- */}
                    <div className="modal-section-group-premium alternate-bg-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">02</span>
                            <h3>Agendamento e Local</h3>
                        </div>

                        <div className="fields-grid-3-premium">
                            <div className="nova-pauta-field-premium">
                                <div className="label-with-hint-premium">
                                    <label className="field-label-premium">Data</label>
                                    {pautaData && <span className="day-hint-fixed-premium">{getDayOfWeek(pautaData)}</span>}
                                </div>
                                <input
                                    type="date"
                                    className="input-premium"
                                    value={pautaData}
                                    onChange={e => setPautaData(e.target.value)}
                                />
                            </div>

                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Horário da Cobertura</label>
                                <div className="time-range-group-premium">
                                    <input
                                        type="time"
                                        className="input-premium time-input-premium"
                                        value={pautaHorarioStart}
                                        onChange={e => setPautaHorarioStart(e.target.value)}
                                    />
                                    <span className="time-separator-premium">às</span>
                                    <input
                                        type="time"
                                        className="input-premium time-input-premium"
                                        value={pautaHorarioEnd}
                                        onChange={e => setPautaHorarioEnd(e.target.value)}
                                    />
                                </div>
                            </div>

                            {isPautaExterna && (
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">Saída do Paço</label>
                                    <input
                                        type="time"
                                        className="input-premium"
                                        value={pautaSaida}
                                        onChange={e => setPautaSaida(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="nova-pauta-field-premium mt-1-premium">
                            <label className="field-label-premium">Endereço Completo</label>
                            <div className="address-input-wrapper-premium">
                                <input
                                    type="text"
                                    list="enderecos-salvos"
                                    className="input-premium address-input-premium"
                                    placeholder="Rua, número, bairro ou nome do local..."
                                    value={pautaEndereco}
                                    onChange={e => setPautaEndereco(e.target.value)}
                                />
                                <datalist id="enderecos-salvos">
                                    {uniqueAddresses.map((addr, idx) => (
                                        <option key={idx} value={addr} />
                                    ))}
                                </datalist>
                                {pautaEndereco && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pautaEndereco)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="maps-button-premium"
                                        title="Ver no Mapa"
                                    >
                                        <MapPin size={16} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Toggle Pauta Externa */}
                        <div className={`pauta-externa-toggle-card-premium ${isPautaExterna ? 'active' : ''}`}
                            onClick={() => setIsPautaExterna(!isPautaExterna)}>
                            <div className="toggle-info-premium">
                                <span className="toggle-title-premium">Adicionar à Agenda Externa</span>
                                <span className="toggle-description-premium">Esta pauta ficará visível para toda a equipe externa</span>
                            </div>
                            <div className={`toggle-switch-premium ${isPautaExterna ? 'on' : ''}`}>
                                <div className="toggle-knob-premium"></div>
                            </div>
                        </div>
                    </div>

                    {/* --- Seção 3: Equipe e Responsáveis --- */}
                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">03</span>
                            <h3>Equipe e Responsáveis</h3>
                        </div>

                        <div className="fields-grid-2-premium">
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Departamento / Secretaria</label>
                                <SecretariasMultiSelect
                                    selected={secretarias}
                                    onChange={setSecretarias}
                                />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Responsável pela Pauta</label>
                                <TeamMultiSelect
                                    selected={creators}
                                    onChange={setCreators}
                                    placeholder="Busque e selecione os responsáveis pela pauta..."
                                />
                            </div>
                        </div>

                        {isPautaExterna && (
                            <div className="nova-pauta-field-premium mt-1-premium">
                                <label className="field-label-premium">Equipe Externa (Agenda)</label>
                                <TeamMultiSelect
                                    selected={assignees}
                                    onChange={setAssignees}
                                    placeholder="Busque e selecione os membros da equipe..."
                                />
                            </div>
                        )}
                    </div>

                    {/* --- Seção 4: Configurações Extras --- */}
                    <div className="modal-section-group-premium alternate-bg-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">04</span>
                            <h3>Configurações Extras</h3>
                        </div>

                        <div className="fields-grid-2-premium">
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Prioridade da Pauta</label>
                                <div className="prio-pills-container-premium">
                                    {[
                                        { id: 'alta', label: 'Alta' },
                                        { id: 'media', label: 'Média' },
                                        { id: 'baixa', label: 'Baixa' }
                                    ].map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPriority(p.id as TaskPriority)}
                                            className={`prio-pill-premium ${p.id} ${priority === p.id ? 'active' : ''}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Presença do Prefeito</label>
                                <div className={`pauta-externa-toggle-card-premium ${presencaPrefeito ? 'active' : ''}`}
                                    onClick={() => setPresencaPrefeito(!presencaPrefeito)}
                                    style={{ margin: 0, padding: '0.75rem 1rem' }}>
                                    <div className="toggle-info-premium">
                                        <span className="toggle-title-premium">Confirmada na agenda oficial</span>
                                    </div>
                                    <div className={`toggle-switch-premium ${presencaPrefeito ? 'on' : ''}`}>
                                        <div className="toggle-knob-premium"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    </>)}

                    {activeTab === 'release' && (
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📝</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Ficha de Release</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Os campos dedicados para produção de Release (Checklist de pauta, contatos, etc) serão construídos aqui.</p>
                        </div>
                    )}

                    {activeTab === 'post' && (
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">📱</span>
                                <h3>Estratégia de Post</h3>
                            </div>

                            <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                <label className="field-label-premium">CRIAÇÃO DO TEXTO (DESCRIÇÃO)</label>
                                <textarea
                                    className="input-premium-textarea"
                                    rows={4}
                                    placeholder="Escreva a legenda sugerida para o post..."
                                    value={postCriacaoTexto}
                                    onChange={e => setPostCriacaoTexto(e.target.value)}
                                />
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginTop: '0.75rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={postCriacaoCorrigido}
                                        onChange={e => setPostCriacaoCorrigido(e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                                    />
                                    Texto de Criação Corrigido
                                </label>
                            </div>

                            <div className="modal-section-group-premium alternate-bg-premium" style={{ margin: '0 -2rem', padding: '1.5rem 2rem' }}>
                                <div className="section-header-premium">
                                    <span className="section-number-premium" style={{ background: '#f0f9ff', color: '#0ea5e9' }}>✓</span>
                                    <h3>Controle de Aprovação</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    {/* Aprovado */}
                                    <div className={`pauta-externa-toggle-card-premium ${postAprovado ? 'active' : ''}`}
                                        onClick={() => {
                                            setPostAprovado(!postAprovado);
                                            if (!postAprovado) {
                                                setPostReprovado(false);
                                            }
                                        }}>
                                        <div className="toggle-info-premium">
                                            <span className="toggle-title-premium">Post Aprovado</span>
                                            <span className="toggle-description-premium">Pronto para publicação</span>
                                        </div>
                                        <div className={`toggle-switch-premium ${postAprovado ? 'on' : ''}`}>
                                            <div className="toggle-knob-premium"></div>
                                        </div>
                                    </div>

                                    {/* Alterado / Corrigido */}
                                    <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                        <div className="nova-pauta-field-premium">
                                            <label className="field-label-premium">FOI ALTERADO / CORRIGIDO?</label>
                                            <textarea
                                                className="input-premium-textarea"
                                                rows={2}
                                                placeholder="Descreva o que foi alterado ou o que precisa ser corrigido..."
                                                value={postAlteradoTexto}
                                                onChange={e => setPostAlteradoTexto(e.target.value)}
                                                style={{ fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Reprovado / Cancelado */}
                                    <div style={{ background: postReprovado ? '#fff1f2' : 'white', padding: '1.25rem', borderRadius: '12px', border: postReprovado ? '1.5px solid #fda4af' : '1.5px solid #e2e8f0', transition: 'all 0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: postReprovado ? '1rem' : '0' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: postReprovado ? '#be123c' : '#1e293b' }}>Post Reprovado / Cancelado</span>
                                                <span style={{ fontSize: '0.75rem', color: postReprovado ? '#e11d48' : '#64748b' }}>Marcar se o material foi descartado</span>
                                            </div>
                                            <div 
                                                className={`toggle-switch-premium ${postReprovado ? 'on' : ''}`} 
                                                onClick={() => {
                                                    setPostReprovado(!postReprovado);
                                                    if (!postReprovado) setPostAprovado(false);
                                                }}
                                                style={{ background: postReprovado ? '#e11d48' : undefined }}
                                            >
                                                <div className="toggle-knob-premium"></div>
                                            </div>
                                        </div>
                                        {postReprovado && (
                                            <div className="nova-pauta-field-premium">
                                                <label className="field-label-premium" style={{ color: '#be123c' }}>MOTIVO DO CANCELAMENTO</label>
                                                <textarea
                                                    className="input-premium-textarea"
                                                    rows={2}
                                                    placeholder="Por que este post foi reprovado ou cancelado?"
                                                    value={postReprovadoComentario}
                                                    onChange={e => setPostReprovadoComentario(e.target.value)}
                                                    style={{ fontSize: '0.85rem', borderColor: '#fda4af' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-section-group-premium" style={{ marginTop: '1.5rem' }}>
                                <div className="section-header-premium">
                                    <span className="section-number-premium">📦</span>
                                    <h3>Material Solicitado</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                    {[
                                        { id: 'release', label: 'Release' },
                                        { id: 'post', label: 'Post' },
                                        { id: 'video', label: 'Vídeo' },
                                        { id: 'foto', label: 'Foto' },
                                        { id: 'arte', label: 'Arte' },
                                        { id: 'inauguracao', label: 'Inauguração' }
                                    ].map(mat => {
                                        const typeId = mat.id as TaskType;
                                        const isActive = types.includes(typeId);
                                        return (
                                            <button 
                                                key={mat.id}
                                                type="button" 
                                                onClick={() => {
                                                    setTypes(prev => 
                                                        prev.includes(typeId) 
                                                            ? prev.filter(m => m !== typeId) 
                                                            : [...prev, typeId]
                                                    );
                                                }}
                                                className={`prio-pill-premium ${isActive ? 'active' : ''}`}
                                                style={{ 
                                                    padding: '1rem', 
                                                    fontSize: '1rem', 
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    background: isActive ? '#1e293b' : 'white',
                                                    color: isActive ? 'white' : '#475569',
                                                    border: '1.5px solid',
                                                    borderColor: isActive ? '#1e293b' : '#e2e8f0',
                                                    boxShadow: isActive ? '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' : 'none',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {mat.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div style={{ marginTop: '1rem' }}>
                                    <button type="button" className="btn-edit-premium" style={{ borderRadius: '20px', padding: '0.5rem 1rem', width: 'auto' }}>
                                        <Plus size={14} /> Novo Formato
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.75rem', fontStyle: 'italic' }}>
                                    💡 Selecione os formatos previstos para esta estratégia de post.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium" style={{ background: 'hsla(210, 80%, 96%, 1)', color: 'hsl(210, 70%, 50%)' }}><Plus size={14} /></span>
                                    <h3>Planejamento e Captação (Vídeo)</h3>
                                </div>

                                <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                    <label className="field-label-premium">Resumo da Pauta / Briefing de Vídeo</label>
                                    <textarea
                                        className="input-premium-textarea"
                                        rows={4}
                                        placeholder="Objetivo do vídeo, roteiro básico, referências e observações para a equipe de captação e edição..."
                                        value={videoBriefing}
                                        onChange={e => setVideoBriefing(e.target.value)}
                                    />
                                </div>

                                <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                    <label className="field-label-premium">O que precisa ser feito?</label>
                                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0' }}>
                                        {[
                                            { id: 'cobertura', label: 'Cobertura (Imagens)' },
                                            { id: 'depoimentos', label: 'Depoimentos' },
                                            { id: 'drone', label: 'Imagens Aéreas (Drone)' }
                                        ].map(item => (
                                            <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={videoNecessidades.includes(item.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setVideoNecessidades([...videoNecessidades, item.id]);
                                                        else setVideoNecessidades(videoNecessidades.filter(x => x !== item.id));
                                                    }}
                                                    style={{ width: '18px', height: '18px', accentColor: '#3b82f6' }}
                                                />
                                                {item.label}
                                            </label>
                                        ))}
                                    </div>
                                    {videoNecessidades.includes('depoimentos') && (
                                        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700 }}>
                                            <span style={{ background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>💡 AVISO:</span>
                                            Não esqueça de levar o microfone!
                                        </div>
                                    )}
                                </div>

                                <div className="fields-grid-2-premium">
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Captação (Imagens)</label>
                                        <TeamMultiSelect
                                            selected={videoCaptacaoEquipe}
                                            onChange={setVideoCaptacaoEquipe}
                                            placeholder="Quem vai gravar?"
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Data da Captação</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={videoCaptacaoData}
                                            onChange={e => setVideoCaptacaoData(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="fields-grid-2-premium mt-1-premium">
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Edição / Finalização</label>
                                        <TeamMultiSelect
                                            selected={videoEdicaoEquipe}
                                            onChange={setVideoEdicaoEquipe}
                                            placeholder="Quem vai editar?"
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Previsão de Edição</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={videoEdicaoData}
                                            onChange={e => setVideoEdicaoData(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-section-group-premium alternate-bg-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">🎬</span>
                                    <h3>Controle de Entrega</h3>
                                </div>
                                <div className="fields-grid-2-premium">
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Prazo Máximo de Entrega</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            value={videoEntregaData}
                                            onChange={(e) => {
                                                setVideoEntregaData(e.target.value);
                                                // Automação: sincroniza com a data principal da pauta se estiver vazia
                                                if (!pautaData) setPautaData(e.target.value);
                                            }}
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Prioridade de Ilha</label>
                                        <div className="prio-pills-container-premium">
                                            {['baixa', 'media', 'alta'].map(p => (
                                                <button
                                                    key={p}
                                                    type="button"
                                                    onClick={() => setPriority(p as TaskPriority)}
                                                    className={`prio-pill-premium ${p} ${priority === p ? 'active' : ''}`}
                                                    style={{ flex: 1 }}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', fontStyle: 'italic' }}>
                                    💡 No checkout, o status da pauta será definido como "Em Produção" se houver equipe de vídeo vinculada.
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'foto' && (
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📸</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Pauta de Fotografia</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Lista de porta-vozes, ângulos necessários e momentos-chave para registro fotográfico.</p>
                        </div>
                    )}

                    {activeTab === 'arte' && (
                        <div className="modal-section-group-premium">
                            <div className="section-header-premium">
                                <span className="section-number-premium">🎨</span>
                                <h3>Pedido de Arte</h3>
                            </div>
                            
                            <div className="nova-pauta-field-premium" style={{ marginBottom: '1.5rem' }}>
                                <label className="field-label-premium">TIPO DE PEÇAS</label>
                                <textarea
                                    className="input-premium-textarea"
                                    rows={4}
                                    placeholder="Descreva as peças necessárias (ex: Banner 120x80, Arte para Instagram, Card de convite...)"
                                    value={arteTipoPecas}
                                    onChange={e => setArteTipoPecas(e.target.value)}
                                />
                            </div>

                            <div className="fields-grid-2-premium">
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">PRAZO DE ENTREGA</label>
                                    <input
                                        type="date"
                                        className="input-premium"
                                        value={arteEntregaData}
                                        onChange={e => setArteEntregaData(e.target.value)}
                                    />
                                </div>
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">ANEXOS / REFERÊNCIAS</label>
                                    <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #e2e8f0', textAlign: 'center' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>Os anexos podem ser adicionados após a criação da pauta através do botão de arquivos.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'inauguracao' && (
                        <>
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium" style={{ background: 'hsla(330, 60%, 96%, 1)', color: 'hsl(330, 55%, 55%)' }}><Building2 size={14} /></span>
                                    <h3>Configuração da Inauguração</h3>
                                </div>

                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">Tipo de Entrega / Evento</label>
                                    <div className="prio-pills-container-premium">
                                        <button
                                            type="button"
                                            onClick={() => handleInaugTipoChange('simples')}
                                            className={`prio-pill-premium ${inaugTipo === 'simples' ? 'active' : ''}`}
                                            style={{ 
                                                borderColor: inaugTipo === 'simples' ? 'hsl(330, 55%, 55%)' : undefined, 
                                                color: inaugTipo === 'simples' ? 'hsl(330, 55%, 55%)' : undefined, 
                                                background: inaugTipo === 'simples' ? 'hsla(330, 60%, 96%, 1)' : undefined,
                                                flex: 1
                                            }}
                                        >
                                            Inauguração Simples
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleInaugTipoChange('master')}
                                            className={`prio-pill-premium ${inaugTipo === 'master' ? 'active' : ''}`}
                                            style={{ 
                                                borderColor: inaugTipo === 'master' ? 'hsl(330, 55%, 55%)' : undefined, 
                                                color: inaugTipo === 'master' ? '#fff' : undefined, 
                                                background: inaugTipo === 'master' ? 'hsl(330, 55%, 55%)' : undefined,
                                                flex: 1
                                            }}
                                        >
                                            Inauguração Master
                                        </button>
                                    </div>
                                    <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                        {inaugTipo === 'master' 
                                            ? '⚠️ Inauguração Master requer estrutura completa de telão e vídeos.' 
                                            : 'Entrega padrão com placa e backdrop.'}
                                    </p>
                                </div>
                            </div>

                            <div className="modal-section-group-premium alternate-bg-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">✓</span>
                                    <h3>Checklist SECOM</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    {inaugChecklist.map(item => (
                                        <label
                                            key={item.id}
                                            className={`pauta-externa-toggle-card-premium ${item.done ? 'active' : ''}`}
                                            style={{ cursor: 'pointer', margin: 0, padding: '0.6rem 1rem', border: item.done ? '1.5px solid hsl(330, 55%, 55%)' : undefined }}
                                            onClick={() => {
                                                setInaugChecklist(prev =>
                                                    prev.map(i => i.id === item.id ? { ...i, done: !i.done } : i)
                                                );
                                            }}
                                        >
                                            <div className="toggle-info-premium">
                                                <span className="toggle-title-premium" style={{ fontSize: '0.85rem' }}>{item.label}</span>
                                            </div>
                                            <div className={`toggle-switch-premium ${item.done ? 'on' : ''}`} style={{ background: item.done ? 'hsl(330, 55%, 55%)' : undefined, width: '36px', height: '18px' }}>
                                                <div className="toggle-knob-premium" style={{ width: '12px', height: '12px', transform: item.done ? 'translateX(18px)' : undefined }}></div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="nova-pauta-footer-premium">
                        <button type="button" className="btn-cancel-premium" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className="btn-save-premium" disabled={!title || isSubmitting}>
                            <span>{isSubmitting ? 'Criando Pauta...' : 'Criar Pauta'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
