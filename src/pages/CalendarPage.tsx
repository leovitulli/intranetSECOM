import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Video, Camera, Landmark, FileText, Palette, Settings } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import EventModal from '../components/EventModal';
import type { AgendaEvent } from '../components/EventModal';
import type { Task } from '../types/kanban';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    isSameMonth,
    isSameDay,
    addDays,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './CalendarPage.css';

interface CalendarEvent {
    id: string;
    title: string;
    type: 'pauta' | 'feriado' | 'comemorativa' | 'inauguracao';
    date: Date;
}


export default function CalendarPage() {
    const { tasks, events: agendaEvents, team, updateTask, updateEvent, deleteEvent } = useData();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedAgendaEvent, setSelectedAgendaEvent] = useState<AgendaEvent | null>(null);

    // Filter State
    const [selectedFilters, setSelectedFilters] = useState<string[]>(['release', 'arte', 'video', 'foto', 'inauguracao', 'sistema']);

    const [comemorativas, setComemorativas] = useState<CalendarEvent[]>([
        { id: '1', title: 'Confraternização Universal (Feriado)', type: 'feriado', date: parseISO('2026-01-01') },
        { id: '2', title: 'Carnaval (Feriado)', type: 'feriado', date: parseISO('2026-02-17') },
        { id: '3', title: 'Dia Internacional da Mulher', type: 'comemorativa', date: parseISO('2026-03-08') },
    ]);

    const events = useMemo(() => {
        const mappedTasks: CalendarEvent[] = tasks
            .filter(t => t.dueDate)
            .filter(t => {
                // If "inauguracao" is selected, show tasks with 'inauguracao' type or status
                if (selectedFilters.includes('inauguracao') && (t.status === 'inauguracao' || t.type.includes('inauguracao'))) return true;
                // Otherwise check if any of the task types are in selected filters
                return t.type.some(type => selectedFilters.includes(type));
            })
            .map(t => ({
                id: `task-${t.id}`,
                title: t.status === 'inauguracao' ? (t.inauguracao_nome || t.title) : t.title,
                type: t.status === 'inauguracao' ? 'inauguracao' : 'pauta',
                date: t.dueDate!
            }));

        const mappedAgenda: CalendarEvent[] = agendaEvents
            .filter(() => selectedFilters.includes('release') || selectedFilters.includes('video') || selectedFilters.includes('foto')) // Agenda usually falls under general pauta
            .map(e => ({
                id: `agenda-${e.id}`,
                title: `Externa: ${e.title}`,
                type: 'pauta',
                date: e.date
            }));

        const mappedSystem = comemorativas.filter(() => selectedFilters.includes('sistema'));

        return [...mappedTasks, ...mappedAgenda, ...mappedSystem];
    }, [tasks, agendaEvents, comemorativas, selectedFilters]);

    // New Event Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventType, setNewEventType] = useState<'pauta' | 'feriado' | 'comemorativa'>('comemorativa');
    const [newEventDate, setNewEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const handleAddEvent = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEventTitle) return;

        const newEvent: CalendarEvent = {
            id: Date.now().toString(),
            title: newEventTitle,
            type: newEventType,
            date: parseISO(newEventDate) // use parseISO for robust form date parsing
        };

        setComemorativas([...comemorativas, newEvent]);
        setIsModalOpen(false);
        setNewEventTitle('');
    };

    const handleEventClick = (evt: CalendarEvent) => {
        if (evt.id.startsWith('task-')) {
            const taskId = evt.id.replace('task-', '');
            const foundTask = tasks.find(t => t.id === taskId);
            if (foundTask) setSelectedTask(foundTask);
        } else if (evt.id.startsWith('agenda-')) {
            const eventId = evt.id.replace('agenda-', '');
            const foundEvent = agendaEvents.find(e => e.id === eventId);
            if (foundEvent) setSelectedAgendaEvent(foundEvent);
        }
    };

    // Generate Calendar Grid
    const renderHeader = () => {
        return (
            <div className="calendar-navigation-header">
                <div className="calendar-nav-controls">
                    <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <h2>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
                    <button className="icon-btn" onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
                
                <div className="calendar-legend">
                    <span className="legend-item"><div className="legend-marker marker-pauta"></div> Pauta Oficial</span>
                    <span className="legend-item"><div className="legend-marker marker-feriado"></div> Feriado Nacional/Local</span>
                    <span className="legend-item"><div className="legend-marker marker-comemorativa"></div> Data Comemorativa</span>
                    <span className="legend-item"><div className="legend-marker marker-inauguracao"></div> Inaugurações</span>
                </div>
            </div>
        );
    };

    const renderDaysOfWeek = () => {
        const days = [];
        const startDate = startOfWeek(currentMonth, { locale: ptBR });

        for (let i = 0; i < 7; i++) {
            days.push(
                <div className="calendar-dow" key={i}>
                    {format(addDays(startDate, i), 'EEEE', { locale: ptBR }).substring(0, 3)}
                </div>
            );
        }
        return <div className="calendar-days-row">{days}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { locale: ptBR });
        const endDate = endOfWeek(monthEnd, { locale: ptBR });

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = '';

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, 'd');
                const cloneDay = day;

                // Get events for this specific day
                const dayEvents = events.filter(e => isSameDay(e.date, cloneDay));

                days.push(
                    <div
                        className={`calendar-cell ${!isSameMonth(day, monthStart)
                            ? 'disabled'
                            : isSameDay(day, new Date()) ? 'selected' : ''
                            }`}
                        key={day.toISOString()}
                    >
                        <span className="cell-number">{formattedDate}</span>
                        <div className="cell-events">
                            {dayEvents.map(evt => (
                                <div
                                    key={evt.id}
                                    className={`calendar-event-bar type-${evt.type}`}
                                    title={evt.title}
                                    onClick={() => handleEventClick(evt)}
                                >
                                    <span className="event-label">{evt.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="calendar-row" key={day.toISOString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="calendar-body">{rows}</div>;
    };

    return (
        <div className="page-container calendar-page">
            <div className="page-header">
                <div>
                    <h1>Calendário</h1>
                    <p className="subtitle">Planejamento mensal de pautas, feriados e datas comemorativas.</p>
                </div>
                <div className="header-actions-group">
                    <div className="calendar-filter-chips">
                        {[
                            { id: 'video', label: 'Vídeos', icon: <Video size={14} />, color: '#ec4899' },
                            { id: 'foto', label: 'Fotos', icon: <Camera size={14} />, color: '#0d9488' },
                            { id: 'inauguracao', label: 'Inauguração', icon: <Landmark size={14} />, color: '#7c3aed' },
                            { id: 'release', label: 'Release', icon: <FileText size={14} />, color: '#2563eb' },
                            { id: 'arte', label: 'Arte', icon: <Palette size={14} />, color: '#8b5cf6' },
                            { id: 'sistema', label: 'Sistema', icon: <Settings size={14} />, color: '#64748b' },
                        ].map(f => (
                            <button
                                key={f.id}
                                className={`filter-chip ${selectedFilters.includes(f.id) ? 'active' : ''}`}
                                style={{ 
                                    '--chip-color': f.color,
                                    border: selectedFilters.includes(f.id) ? `1px solid ${f.color}` : '1px solid transparent'
                                } as React.CSSProperties}
                                onClick={() => {
                                    setSelectedFilters(prev =>
                                        prev.includes(f.id)
                                            ? prev.filter(x => x !== f.id)
                                            : [...prev, f.id]
                                    );
                                }}
                            >
                                <span className="chip-icon" style={{ color: f.color }}>{f.icon}</span>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} />
                        Adicionar Data/Evento
                    </button>
                </div>
            </div>

            <div className="calendar-full-wrapper glass">
                {renderHeader()}
                {renderDaysOfWeek()}
                {renderCells()}
            </div>

            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nova Data no Calendário</h2>
                        </div>
                        <form onSubmit={handleAddEvent} className="simple-form">
                            <div className="form-group">
                                <label>Nome do Evento / Data Especial *</label>
                                <input
                                    type="text"
                                    required
                                    value={newEventTitle}
                                    onChange={e => setNewEventTitle(e.target.value)}
                                    placeholder="Ex: Aniversário da Cidade"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group flex-1">
                                    <label>Data *</label>
                                    <input
                                        type="date"
                                        required
                                        value={newEventDate}
                                        onChange={e => setNewEventDate(e.target.value)}
                                    />
                                </div>
                                <div className="form-group flex-1">
                                    <label>Tipo *</label>
                                    <select
                                        value={newEventType}
                                        onChange={e => setNewEventType(e.target.value as any)}
                                    >
                                        <option value="comemorativa">Data Comemorativa</option>
                                        <option value="feriado">Feriado</option>
                                        <option value="pauta">Pauta Agendada</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Salvar no Calendário</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={(updatedTask) => {
                        updateTask(updatedTask);
                        setSelectedTask(null);
                    }}
                />
            )}

            {selectedAgendaEvent && (
                <EventModal
                    event={selectedAgendaEvent}
                    teamMembers={team as any}
                    onClose={() => setSelectedAgendaEvent(null)}
                    onSave={async (savedEvent) => {
                        try {
                            await updateEvent(savedEvent);
                            setSelectedAgendaEvent(null);
                        } catch (error) {
                            alert('Erro ao atualizar agenda.');
                        }
                    }}
                    onDelete={async (id) => {
                        if (confirm("Tem certeza que deseja excluir esta agenda?")) {
                            try {
                                await deleteEvent(id);
                                setSelectedAgendaEvent(null);
                            } catch (error) {
                                alert("Erro ao excluir agenda.");
                            }
                        }
                    }}
                />
            )}
        </div>
    );
}
