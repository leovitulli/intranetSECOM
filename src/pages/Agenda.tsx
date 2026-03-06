import { useState } from 'react';
import { MapPin, Users, Clock } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import EventModal from '../components/EventModal';
import type { AgendaEvent } from '../components/EventModal';
import { useData } from '../contexts/DataContext';
import './Agenda.css';

export default function Agenda() {
    const { events: globalEvents, team, loading, addEvent, updateEvent, deleteEvent } = useData();
    const [currentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);

    const handleSaveEvent = async (savedEvent: AgendaEvent) => {
        try {
            if (editingEvent) {
                await updateEvent(savedEvent);
            } else {
                await addEvent(savedEvent);
            }
            setIsModalOpen(false);
            setEditingEvent(null);
        } catch (error) {
            alert("Erro ao salvar agenda");
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (confirm("Tem certeza que deseja excluir esta agenda?")) {
            try {
                await deleteEvent(id);
                setIsModalOpen(false);
                setEditingEvent(null);
            } catch (error) {
                alert("Erro ao excluir agenda");
            }
        }
    };

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i)); // Mon to Sun

    return (
        <div className="page-container agenda-page">
            <div className="page-header">
                <div>
                    <h1>Agenda da Equipe Externa</h1>
                    <p className="subtitle">Visão geral de organização das equipes durante a semana.</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        className="btn-primary"
                        onClick={() => {
                            setEditingEvent(null);
                            setIsModalOpen(true);
                        }}
                    >
                        Nova Agenda
                    </button>
                </div>
            </div>

            <div className="agenda-grid">
                {days.map(day => {
                    const dayEvents = globalEvents.filter(
                        e => e.date.toDateString() === day.toDateString()
                    ).sort((a, b) => a.time.localeCompare(b.time)); // Simple sort by time string

                    return (
                        <div key={day.toISOString()} className={`agenda-day`}>
                            <div className="day-header" style={{ padding: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{format(day, 'EEEE', { locale: ptBR })}</h3>
                            </div>

                            <div className="day-events">
                                {loading && <p className="empty-state">Carregando...</p>}
                                {!loading && dayEvents.length === 0 ? (
                                    <div className="no-events text-muted">Agenda livre</div>
                                ) : (
                                    !loading && dayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            className="event-card clickable"
                                            onClick={() => {
                                                setEditingEvent(event);
                                                setIsModalOpen(true);
                                            }}
                                        >
                                            <div className="event-time">
                                                <Clock size={14} /> {event.time}
                                            </div>
                                            <h4 className="event-title">{event.title}</h4>
                                            {event.mayor_attending && (
                                                <div className="event-mayor-badge">
                                                    <span className="mayor-dot"></span> Prefeito Participa
                                                </div>
                                            )}

                                            <div className="event-details">
                                                <div className="event-location" title="Localização">
                                                    <MapPin size={14} /> {event.location}
                                                </div>
                                                {event.departure_time && (
                                                    <div className="event-departure" title="Horário de Saída do Paço">
                                                        <span>🚗</span> Saída: {event.departure_time}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="event-team">
                                                <Users size={14} />
                                                <div className="team-avatars">
                                                    {event.teamIds.map(tid => {
                                                        const teamMember = team.find(m => m.id === tid);
                                                        if (!teamMember) return null;
                                                        return teamMember.avatar_url ? (
                                                            <img
                                                                key={tid}
                                                                src={teamMember.avatar_url}
                                                                alt={teamMember.name}
                                                                className="team-avatar-medium"
                                                                style={{ border: `2px solid ${teamMember.color}`, objectFit: 'cover' }}
                                                                title={teamMember.name}
                                                            />
                                                        ) : (
                                                            <div
                                                                key={tid}
                                                                className="team-avatar-medium"
                                                                style={{ backgroundColor: teamMember.color }}
                                                                title={teamMember.name}
                                                            >
                                                                {teamMember.name.charAt(0)}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && (
                <EventModal
                    event={editingEvent}
                    teamMembers={team as any}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveEvent}
                    onDelete={editingEvent ? handleDeleteEvent : undefined}
                />
            )}
        </div>
    );
}
