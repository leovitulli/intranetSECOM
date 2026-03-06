import { useState } from 'react';
import { X } from 'lucide-react';
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
            <div className="modal-content event-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <h2 className="modal-title">{isEditMode ? 'Editar Agenda' : 'Nova Agenda Externa'}</h2>
                    <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        {isEditMode ? 'Atualize os detalhes ou a equipe desta pauta.' : 'Agende um novo compromisso para as equipes de rua.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="event-form">
                    <div className="form-group">
                        <label>Título / Pauta *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Ex: Cobertura Visita Governador"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Localização *</label>
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Ex: Paço Municipal"
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Data *</label>
                            <input
                                type="date"
                                value={dateStr}
                                onChange={e => setDateStr(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group flex-1">
                            <label>Horário (Ex: 14:00 - 16:00) *</label>
                            <input
                                type="text"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                placeholder="00:00 - 00:00"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Horário de Saída do Paço</label>
                            <input
                                type="text"
                                value={departureTime}
                                onChange={e => setDepartureTime(e.target.value)}
                                placeholder="Ex: 13:30"
                            />
                        </div>
                        <div className="form-group flex-1" style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
                            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 600 }}>
                                <input
                                    type="checkbox"
                                    checked={mayorAttending}
                                    onChange={e => setMayorAttending(e.target.checked)}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span className="mayor-dot" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></span>
                                Prefeito Participa?
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Equipe Alocada</label>
                        <div className="team-checkboxes">
                            {teamMembers.map(member => (
                                <label key={member.id} className="team-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={teamIds.includes(member.id)}
                                        onChange={() => handleTeamToggle(member.id)}
                                    />
                                    <span className="color-dot" style={{ backgroundColor: member.color }}></span>
                                    {member.name} <small>({member.job_titles && member.job_titles.length > 0 ? member.job_titles.join(', ') : member.role})</small>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-actions" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        {isEditMode && onDelete ? (
                            <button type="button" className="btn-secondary" style={{ color: 'hsl(350, 80%, 50%)', borderColor: 'hsl(350, 80%, 50%)' }} onClick={() => onDelete(event.id)}>Excluir Agenda</button>
                        ) : <div></div>}
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                            <button type="submit" className="btn-primary" disabled={!title || !location || !time}>
                                {isEditMode ? 'Salvar Alterações' : 'Criar Agenda'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
