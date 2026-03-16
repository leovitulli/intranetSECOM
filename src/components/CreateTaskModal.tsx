import { useState } from 'react';
import type { Task, TaskType, TaskPriority } from '../types/kanban';
import { X, Plus, MapPin } from 'lucide-react';
import './CreateTaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';
import TeamMultiSelect from './TeamMultiSelect';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (task: Task) => void;
}

export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
    const { user } = useAuth();
    const { team, tasks } = useData();
    const uniqueAddresses = Array.from(new Set(tasks.map((t: Task) => t.pauta_endereco).filter(Boolean)));
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [types, setTypes] = useState<TaskType[]>(['release']);
    const [priority, setPriority] = useState<TaskPriority>('media');
    const [assignees, setAssignees] = useState<string[]>([]);
    const [secretarias, setSecretarias] = useState<string[]>([]);
    const [creator, setCreator] = useState(user?.name || '');

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

    const handleTypeToggle = (typeStr: TaskType) => {
        setTypes(prev =>
            prev.includes(typeStr)
                ? (prev.length > 1 ? prev.filter(t => t !== typeStr) : prev)
                : [...prev, typeStr]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const newTask: Task = {
            id: crypto.randomUUID(),
            title,
            description: description || '',
            status: 'solicitado',
            type: types,
            creator: creator || (user ? user.name : 'Unknown User'),
            priority,
            assignees,
            dueDate: pautaData ? new Date(pautaData) : null,
            createdAt: new Date(),
            comments: [],
            attachments: [],
            inauguracao_nome: types.includes('inauguracao' as TaskType) ? title : undefined,
            inauguracao_endereco: pautaEndereco,
            inauguracao_secretarias: secretarias,
            inauguracao_data: pautaData ? new Date(pautaData) : undefined,
            pauta_data: pautaData,
            pauta_horario: (pautaHorarioStart && pautaHorarioEnd) ? `${pautaHorarioStart} às ${pautaHorarioEnd}` : (pautaHorarioStart || pautaHorarioEnd || ''),
            pauta_saida: pautaSaida,
            pauta_endereco: pautaEndereco,
            is_pauta_externa: isPautaExterna
        };

        onCreate(newTask);
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
                            <h2>Nova Pauta</h2>
                            <span className="header-subtitle-premium">Preencha os detalhes para criar um novo registro</span>
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="nova-pauta-body-premium" noValidate>
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
                                <select
                                    className="input-premium select-premium"
                                    value={creator}
                                    onChange={e => setCreator(e.target.value)}
                                >
                                    <option value="">Selecione um responsável...</option>
                                    {team.map(m => (
                                        <option key={m.id} value={m.name}>{m.name}</option>
                                    ))}
                                </select>
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
                                <label className="field-label-premium">Tipo de Material</label>
                                <div className="material-pills-premium">
                                    {[
                                        { id: 'release', label: 'Release' },
                                        { id: 'post', label: 'Post' },
                                        { id: 'video', label: 'Vídeo' },
                                        { id: 'foto', label: 'Foto' },
                                        { id: 'inauguracao', label: 'Inauguração' }
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            className={`material-pill-premium ${types.includes(m.id as TaskType) ? 'active' : ''}`}
                                            onClick={() => handleTypeToggle(m.id as TaskType)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="nova-pauta-footer-premium">
                        <button type="button" className="btn-cancel-premium" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-save-premium" disabled={!title}>
                            <span>Criar Pauta</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
