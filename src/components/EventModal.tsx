import { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import './EventModal.css';

export interface AgendaEvent {
    id: string;
    title: string;
    location: string;
    date: Date;
    time: string;
    departure_time?: string;
    mayor_attending?: boolean;
    teamIds: string[];
}

interface EventModalProps {
    event?: AgendaEvent | null; // If null/undefined, it's create mode
    teamMembers: { id: string, name: string, role: string, color: string, job_titles?: string[] }[];
    onClose: () => void;
    onSave: (event: AgendaEvent) => void;
    onDelete?: (id: string) => void;
}

export default function EventModal({ event, teamMembers, onClose, onSave, onDelete }: EventModalProps) {
    const isEditMode = !!event;

    const [title, setTitle] = useState(event?.title || '');
    const [location, setLocation] = useState(event?.location || '');

    // Convert date object to YYYY-MM-DD for input type="date"
    const [dateStr, setDateStr] = useState(
        event?.date ? event.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    );
    const [time, setTime] = useState(event?.time || '');
    const [departureTime, setDepartureTime] = useState(event?.departure_time || '');
    const [mayorAttending, setMayorAttending] = useState(!!event?.mayor_attending);
    const [teamIds, setTeamIds] = useState<string[]>(event?.teamIds || []);

    const handleTeamToggle = (id: string) => {
        setTeamIds(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !location.trim() || !dateStr || !time.trim()) return;

        // Ensure date takes local timezone properly to avoid shifting days
        const [year, month, day] = dateStr.split('-');
        const formattedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        const savedEvent: AgendaEvent = {
            id: event?.id || Date.now().toString(),
            title,
            location,
            date: formattedDate,
            time,
            departure_time: departureTime,
            mayor_attending: mayorAttending,
            teamIds
        };

        onSave(savedEvent);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content nova-pauta-modal event-modal-premium" onClick={e => e.stopPropagation()}>
                <div className="nova-pauta-header-premium">
                    <div className="header-left-premium">
                        <div className="header-icon-premium" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)' }}>
                            <MapPin size={24} />
                        </div>
                        <div className="header-titles-premium">
                            <span className="header-subtitle-premium">
                                {isEditMode ? 'Atualize os detalhes ou a equipe desta pauta.' : 'Agende um novo compromisso para as equipes de rua.'}
                            </span>
                            <h2>{isEditMode ? 'Editar Agenda' : 'Nova Agenda Externa'}</h2>
                        </div>
                    </div>
                    <button className="close-btn-premium" onClick={onClose} title="Fechar">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="nova-pauta-body-premium">
                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">01</span>
                            <h3>Informações da Pauta</h3>
                        </div>
                        
                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Título / Pauta *</label>
                            <input
                                type="text"
                                className="input-premium title-input-premium"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Ex: Cobertura Visita Governador"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="nova-pauta-field-premium">
                            <label className="field-label-premium">Localização *</label>
                            <input
                                type="text"
                                className="input-premium"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Ex: Paço Municipal"
                                required
                            />
                        </div>
                    </div>

                    <div className="modal-section-group-premium alternate-bg-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">02</span>
                            <h3>Agendamento</h3>
                        </div>

                        <div className="fields-grid-2-premium">
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Data *</label>
                                <input
                                    type="date"
                                    className="input-premium"
                                    value={dateStr}
                                    onChange={e => setDateStr(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Horário (Ex: 14:00 - 16:00) *</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    placeholder="00:00 - 00:00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="fields-grid-2-premium mt-1-premium">
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Horário de Saída do Paço</label>
                                <input
                                    type="text"
                                    className="input-premium"
                                    value={departureTime}
                                    onChange={e => setDepartureTime(e.target.value)}
                                    placeholder="Ex: 13:30"
                                />
                            </div>
                            <div className="nova-pauta-field-premium">
                                <label className="field-label-premium">Presença do Prefeito</label>
                                <div className={`pauta-externa-toggle-card-premium ${mayorAttending ? 'active' : ''}`}
                                    onClick={() => setMayorAttending(!mayorAttending)}
                                    style={{ margin: 0, padding: '0.75rem 1rem' }}>
                                    <div className="toggle-info-premium">
                                        <span className="toggle-title-premium">Confirmada na agenda</span>
                                    </div>
                                    <div className={`toggle-switch-premium ${mayorAttending ? 'on' : ''}`}>
                                        <div className="toggle-knob-premium"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-section-group-premium">
                        <div className="section-header-premium">
                            <span className="section-number-premium">03</span>
                            <h3>Equipe Alocada</h3>
                        </div>

                        <div className="team-checkboxes-premium">
                            {teamMembers.map(member => (
                                <label key={member.id} className={`team-member-pill-premium ${teamIds.includes(member.id) ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={teamIds.includes(member.id)}
                                        onChange={() => handleTeamToggle(member.id)}
                                        style={{ display: 'none' }}
                                    />
                                    <span className="color-dot" style={{ backgroundColor: member.color }}></span>
                                    <div className="member-info-premium">
                                        <span className="name">{member.name}</span>
                                        <span className="role">{member.job_titles && member.job_titles.length > 0 ? member.job_titles.join(', ') : member.role}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="nova-pauta-footer-premium">
                        {isEditMode && onDelete && (
                            <button type="button" className="btn-cancel-premium" style={{ color: '#e11d48', background: '#fff1f2', marginRight: 'auto' }} onClick={() => onDelete(event.id)}>Excluir</button>
                        )}
                        <button type="button" className="btn-cancel-premium" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-save-premium" disabled={!title || !location || !time}>
                            {isEditMode ? 'Salvar Alterações' : 'Criar Agenda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
