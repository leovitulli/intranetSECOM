import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Building2 } from 'lucide-react';
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
    priority?: string;
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
        const isNoFilterSelected = selectedFilters.length === 0;

        const mappedTasks: CalendarEvent[] = tasks
            .filter(t => t.dueDate)
            .filter(t => {
                if (isNoFilterSelected) return true;
                if (selectedFilters.includes('inauguracao') && (t.status === 'inauguracao' || t.type.includes('inauguracao'))) return true;
                return t.type.some(type => selectedFilters.includes(type));
            })
            .map(t => ({
                id: `task-${t.id}`,
                title: t.status === 'inauguracao' ? (t.inauguracao_nome || t.title) : t.title,
                type: t.status === 'inauguracao' ? 'inauguracao' : 'pauta',
                date: t.dueDate!,
                priority: t.priority
            }));

        const mappedAgenda: CalendarEvent[] = agendaEvents
            .filter(() => isNoFilterSelected || selectedFilters.includes('release') || selectedFilters.includes('video') || selectedFilters.includes('foto'))
            .map(e => ({
                id: `agenda-${e.id}`,
                title: `Externa: ${e.title}`,
                type: 'pauta',
                date: e.date
            }));

        const mappedSystem = comemorativas.filter(() => isNoFilterSelected || selectedFilters.includes('sistema'));

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
                    <button className="icon-btn-nav" onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <h2 className="current-month-title">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
                    <button className="icon-btn-nav" onClick={nextMonth}><ChevronRight size={20} /></button>
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
                        <div className="cell-number">{formattedDate}</div>
                        <div className="cell-events">
                            {dayEvents.map(evt => (
                                <div
                                    key={evt.id}
                                    className={`calendar-event-bar type-${evt.type} ${evt.priority ? `priority-${evt.priority}` : ''}`}
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
                    <div className="calendar-filter-chips" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {[
                            { id: 'all', label: 'Todos' },
                            { id: 'inauguracao', label: 'Inauguração' },
                            { id: 'video', label: '🎬 Vídeos' },
                            { id: 'foto', label: '📸 Fotos' },
                            { id: 'release', label: '📝 Release' },
                            { id: 'post', label: '📱 Post' },
                            { id: 'arte', label: '🎨 Arte Gráfica' },
                            { id: 'sistema', label: '⚙️ Sistema' },
                        ].map(f => {
                            const isAllSelected = selectedFilters.length === 6;
                            const isActive = f.id === 'all' ? isAllSelected : selectedFilters.includes(f.id);
                            
                            let badgeClass = '';
                            if (f.id === 'all') {
                                badgeClass = 'badge-tag badge-todos';
                            } else if (f.id === 'sistema') {
                                badgeClass = 'badge-tag badge-sistema';
                            } else {
                                const typeMap: Record<string, string> = {
                                    'foto': 'foto', 'video': 'video', 'release': 'release', 'inauguracao': 'inauguracao', 'arte': 'arte', 'post': 'post'
                                };
                                badgeClass = `badge-tag badge-${typeMap[f.id]}`;
                            }

                            return (
                                <button
                                    key={f.id}
                                    className={`${badgeClass}`}
                                    style={{
                                        opacity: isActive ? 1 : 0.4,
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '0.4rem 1rem',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        boxShadow: isActive ? '0 0 10px rgba(255,255,255,0.1)' : 'none'
                                    }}
                                    onClick={() => {
                                        if (f.id === 'all') {
                                            if (selectedFilters.length === 6) setSelectedFilters([]);
                                            else setSelectedFilters(['video', 'foto', 'inauguracao', 'release', 'arte', 'sistema']);
                                            return;
                                        }
                                        setSelectedFilters(prev =>
                                            prev.includes(f.id)
                                                ? prev.filter(x => x !== f.id)
                                                : [...prev, f.id]
                                        );
                                    }}
                                >
                                    {f.id === 'all' && <Plus size={14} style={{ marginRight: '4px' }} />}
                                    {f.id === 'inauguracao' && <Building2 size={12} style={{ marginRight: '4px' }} />}
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                    <button className="btn-add-event" onClick={() => setIsModalOpen(true)}>
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
