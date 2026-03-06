import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
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
    const [comemorativas, setComemorativas] = useState<CalendarEvent[]>([
        { id: '1', title: 'Confraternização Universal (Feriado)', type: 'feriado', date: parseISO('2026-01-01') },
        { id: '2', title: 'Carnaval (Feriado)', type: 'feriado', date: parseISO('2026-02-17') },
        { id: '3', title: 'Dia Internacional da Mulher', type: 'comemorativa', date: parseISO('2026-03-08') },
    ]);

    const events = useMemo(() => {
        const mappedTasks: CalendarEvent[] = tasks
            .filter(t => t.dueDate)
            .map(t => ({
                id: `task-${t.id}`,
                title: t.status === 'inauguracao' ? (t.inauguracao_nome || t.title) : t.title,
                type: t.status === 'inauguracao' ? 'inauguracao' : 'pauta',
                date: t.dueDate!
            }));

        const mappedAgenda: CalendarEvent[] = agendaEvents.map(e => ({
            id: `agenda-${e.id}`,
            title: `Externa: ${e.title}`,
            type: 'pauta',
            date: e.date
        }));

        return [...mappedTasks, ...mappedAgenda, ...comemorativas];
    }, [tasks, agendaEvents, comemorativas]);

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
            <div className="calendar-header-nav">
                <button className="icon-btn" onClick={prevMonth}><ChevronLeft size={24} /></button>
                <h2>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
                <button className="icon-btn" onClick={nextMonth}><ChevronRight size={24} /></button>
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
                                    className={`calendar-event-pill type-${evt.type}`}
                                    title={evt.title}
                                    onClick={() => handleEventClick(evt)}
                                >
                                    <div className="pill-dot"></div>
                                    <span className="pill-text">{evt.title}</span>
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
                    <h1>Calendário Editorial</h1>
                    <p className="subtitle">Planejamento mensal de pautas, feriados e datas comemorativas.</p>
                </div>
                <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Adicionar Data/Evento
                </button>
            </div>

            <div className="calendar-full-wrapper glass">
                {renderHeader()}
                <div className="calendar-legend">
                    <span className="legend-item"><div className="pill-dot" style={{ background: 'var(--color-primary)' }}></div> Pauta Oficial</span>
                    <span className="legend-item"><div className="pill-dot" style={{ background: '#f87171' }}></div> Feriado Nacional/Local</span>
                    <span className="legend-item"><div className="pill-dot" style={{ background: '#fbbf24' }}></div> Data Comemorativa</span>
                    <span className="legend-item"><div className="pill-dot" style={{ background: 'hsl(330, 60%, 65%)' }}></div> Inaugurações</span>
                </div>
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
