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
    onCreate: (task: Task) => Promise<void>;
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
                is_pauta_externa: isPautaExterna
            };

            await onCreate(newTask);
        } catch (error) {
            console.error("Erro ao criar pauta: ", error);
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
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📱</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Estratégia de Post</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Definições de rede social, legenda sugerida e formatos (Reels, Story, Feed) ficarão nesta aba.</p>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎬</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Briefing de Vídeo</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Roteiro, trilha sugerida e referências de edição para a equipe de vídeo.</p>
                        </div>
                    )}

                    {activeTab === 'foto' && (
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📸</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Pauta de Fotografia</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Lista de porta-vozes, ângulos necessários e momentos-chave para registro fotográfico.</p>
                        </div>
                    )}

                    {activeTab === 'arte' && (
                        <div className="modal-section-group-premium" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎨</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>Pedido de Arte</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>Identidade visual, textos obrigatórios e dimensões para a equipe de criação.</p>
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
