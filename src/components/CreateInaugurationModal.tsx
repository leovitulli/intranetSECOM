import { useState } from 'react';
import { X, MapPin, Building2, Award, CheckSquare, Calendar, Users } from 'lucide-react';
import type { Task, InaugurationTipo, InaugurationChecklistItem } from '../types/kanban';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_TEAM } from '../utils/mockTeam';
import SecretariasMultiSelect from './SecretariasMultiSelect';
import './CreateInaugurationModal.css';

interface CreateInaugurationModalProps {
    onClose: () => void;
    onCreate: (task: Task) => void;
}

const CHECKLIST_SIMPLES: Omit<InaugurationChecklistItem, 'done'>[] = [
    { id: 'placa', label: 'Placa de inauguração' },
    { id: 'backdrop', label: 'Backdrop' },
];

const CHECKLIST_MASTER: Omit<InaugurationChecklistItem, 'done'>[] = [
    { id: 'placa', label: 'Placa de inauguração' },
    { id: 'backdrops', label: 'Backdrops / banners' },
    { id: 'telao', label: '1 Telão' },
    { id: 'video_telao', label: 'Vídeo para telão' },
];

function buildChecklist(tipo: InaugurationTipo): InaugurationChecklistItem[] {
    const items = tipo === 'simples' ? CHECKLIST_SIMPLES : CHECKLIST_MASTER;
    return items.map(item => ({ ...item, done: false }));
}

export default function CreateInaugurationModal({ onClose, onCreate }: CreateInaugurationModalProps) {
    const { user } = useAuth();
    const [nome, setNome] = useState('');
    const [endereco, setEndereco] = useState('');
    const [secretarias, setSecretarias] = useState<string[]>([]);
    const [dataInauguracao, setDataInauguracao] = useState('');
    const [tipo, setTipo] = useState<InaugurationTipo>('simples');
    const [checklist, setChecklist] = useState<InaugurationChecklistItem[]>(buildChecklist('simples'));
    const [assignees, setAssignees] = useState<string[]>([]);

    const handleTipoChange = (newTipo: InaugurationTipo) => {
        setTipo(newTipo);
        setChecklist(buildChecklist(newTipo));
    };

    const handleCheckItem = (id: string) => {
        setChecklist(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
    };

    const toggleAssignee = (name: string) => {
        setAssignees(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || secretarias.length === 0 || !dataInauguracao) return;

        // Creator always included in responsáveis
        const finalAssignees = user && !assignees.includes(user.name)
            ? [user.name, ...assignees]
            : assignees.length > 0 ? assignees : (user ? [user.name] : []);

        const inaugDate = new Date(dataInauguracao + 'T12:00:00');

        const newTask: Task = {
            id: Date.now().toString(),
            title: nome.toUpperCase(),
            description: `**Nome:** ${nome}\n**Endereço:** ${endereco || '—'}\n**Secretarias:** ${secretarias.join(', ')}\n**Tipo:** ${tipo === 'simples' ? 'Inauguração Simples' : 'Inauguração Master'}`,
            status: 'inauguracao',
            type: ['inauguracao'],
            creator: secretarias.join(', ') || (user?.name || 'Desconhecido'),
            priority: 'alta',
            assignees: finalAssignees,
            dueDate: inaugDate, // Data da inauguração = prazo de execução
            comments: [],
            attachments: [],
            inauguracao_nome: nome,
            inauguracao_endereco: endereco,
            inauguracao_secretarias: secretarias,
            inauguracao_tipo: tipo,
            inauguracao_checklist: checklist,
            inauguracao_data: inaugDate,
        };

        onCreate(newTask);
    };

    const allDone = checklist.every(item => item.done);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content inaug-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}><X size={20} /></button>

                <div className="inaug-modal-header">
                    <span className="inaug-badge">Inauguração</span>
                    <h2>SOLICITAÇÃO DE INAUGURAÇÃO</h2>
                    <p>Preencha os dados para registrar uma nova inauguração na SECOM.</p>
                </div>

                <form onSubmit={handleSubmit} className="create-task-form" style={{ paddingTop: '1.5rem' }}>
                    {/* Nome */}
                    <div className="form-group">
                        <label htmlFor="inaug-nome">
                            <Award size={15} /> Nome do que será Inaugurado *
                        </label>
                        <input
                            id="inaug-nome"
                            type="text"
                            placeholder="Ex: Novo Centro Esportivo da Vila Progresso"
                            value={nome}
                            onChange={e => setNome(e.target.value)}
                            required
                        />
                    </div>

                    {/* Endereço */}
                    <div className="form-group">
                        <label htmlFor="inaug-endereco">
                            <MapPin size={15} /> Endereço
                        </label>
                        <input
                            id="inaug-endereco"
                            type="text"
                            placeholder="Ex: Rua das Flores, 123 - Bairro Centro"
                            value={endereco}
                            onChange={e => setEndereco(e.target.value)}
                        />
                    </div>

                    {/* Data da Inauguração */}
                    <div className="form-group">
                        <label htmlFor="inaug-data">
                            <Calendar size={15} /> Data da Inauguração *
                            <small style={{ fontWeight: 400, marginLeft: '6px', color: 'hsl(var(--color-text-muted))' }}>— será o prazo de execução de toda a equipe</small>
                        </label>
                        <input
                            id="inaug-data"
                            type="date"
                            value={dataInauguracao}
                            onChange={e => setDataInauguracao(e.target.value)}
                            required
                        />
                    </div>

                    {/* Secretaria(s) */}
                    <div className="form-group">
                        <label>
                            <Building2 size={15} /> Secretaria(s) Responsável(eis) *
                        </label>
                        <SecretariasMultiSelect
                            selected={secretarias}
                            onChange={setSecretarias}
                            placeholder="Buscar secretaria..."
                        />
                        {secretarias.length === 0 && (
                            <small style={{ color: 'hsl(var(--color-text-muted))' }}>Selecione ao menos uma secretaria.</small>
                        )}
                    </div>

                    {/* Responsáveis */}
                    <div className="form-group">
                        <label>
                            <Users size={15} /> Responsáveis / Colaboradores
                            <small style={{ fontWeight: 400, marginLeft: '6px', color: 'hsl(var(--color-text-muted))' }}>— você é incluído automaticamente</small>
                        </label>
                        <div className="team-grid">
                            {INITIAL_TEAM.filter(m => m.name !== user?.name).map(member => (
                                <label key={member.id} className="type-checkbox" style={{ fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={assignees.includes(member.name)}
                                        onChange={() => toggleAssignee(member.name)}
                                    />
                                    <strong>{member.name}</strong> <span style={{ color: 'var(--color-text-muted)' }}>({member.role})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Tipo de Inauguração */}
                    <div className="form-group">
                        <label>Tipo de Inauguração *</label>
                        <div className="inaug-tipo-selector">
                            <label className={`inaug-tipo-option${tipo === 'simples' ? ' selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="simples"
                                    checked={tipo === 'simples'}
                                    onChange={() => handleTipoChange('simples')}
                                />
                                <div className="inaug-tipo-content">
                                    <strong>Inauguração Simples</strong>
                                    <span>Placa + Backdrop</span>
                                </div>
                            </label>
                            <label className={`inaug-tipo-option${tipo === 'master' ? ' selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="tipo"
                                    value="master"
                                    checked={tipo === 'master'}
                                    onChange={() => handleTipoChange('master')}
                                />
                                <div className="inaug-tipo-content">
                                    <strong>Inauguração Master</strong>
                                    <span>Placa + Backdrops + Telão + Vídeo</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Checklist de materiais */}
                    <div className="form-group">
                        <label>
                            <CheckSquare size={15} /> Checklist de Materiais
                            {allDone && <span className="checklist-all-done">✅ Tudo pronto!</span>}
                        </label>
                        <div className="inaug-checklist">
                            {checklist.map(item => (
                                <label key={item.id} className={`inaug-checklist-item${item.done ? ' done' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={item.done}
                                        onChange={() => handleCheckItem(item.id)}
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button
                            type="submit"
                            className="btn-primary inaug-submit"
                            disabled={!nome.trim() || secretarias.length === 0 || !dataInauguracao}
                        >
                            Criar Inauguração
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
