import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Building2, X } from 'lucide-react';
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
    const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
    const [calendarError, setCalendarError] = useState('');

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
            .filter(t => {
                // Nova Lógica Inteligente: A pauta precisa ter PELO MENOS UMA dessas datas
                return t.pauta_data || t.inauguracao_data || t.video_captacao_data || t.arte_entrega_data || t.dueDate;
            })
            .filter(t => {
                if (isNoFilterSelected) return true;
                if (selectedFilters.includes('inauguracao') && (t.status === 'inauguracao' || t.type.includes('inauguracao'))) return true;
                return (t.type || []).some(type => selectedFilters.includes(type));
            })
            .map(t => {
                // Prioridade de exibição no calendário:
                // 1. Pauta Geral ou Inauguração (O evento em si)
                // 2. Captação de Vídeo ou Entrega de Arte (A produção)
                // 3. Due Date (O prazo genérico)
                let eventDate: Date;
                
                if (t.pauta_data) {
                    eventDate = new Date(t.pauta_data + 'T12:00:00');
                } else if (t.inauguracao_data) {
                    eventDate = t.inauguracao_data;
                } else if (t.status === 'inauguracao' && t.dueDate) {
                    eventDate = t.dueDate;
                } else if (t.type.includes('video') && t.video_captacao_data) {
                    eventDate = t.video_captacao_data;
                } else if (t.type.includes('arte') && t.arte_entrega_data) {
                    eventDate = t.arte_entrega_data;
                } else {
                    eventDate = t.dueDate || t.createdAt;
                }

                return {
                    id: `task-${t.id}`,
                    title: t.status === 'inauguracao' ? (t.inauguracao_nome || t.title) : t.title,
                    type: t.status === 'inauguracao' ? 'inauguracao' : 'pauta',
                    date: eventDate,
                    priority: t.priority
                };
            });

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
                    <div className="modal-content nova-pauta-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="nova-pauta-header-premium">
                            <div className="header-left-premium">
                                <div className="header-icon-premium" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                                    <Plus size={24} />
                                </div>
                                <div className="header-titles-premium">
                                    <span className="header-subtitle-premium">Adicione feriados ou datas comemorativas</span>
                                    <h2>Nova Data no Calendário</h2>
                                </div>
                            </div>
                            <button className="close-btn-premium" onClick={() => setIsModalOpen(false)} title="Fechar">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleAddEvent} className="nova-pauta-body-premium">
                            <div className="modal-section-group-premium">
                                <div className="section-header-premium">
                                    <span className="section-number-premium">01</span>
                                    <h3>Informações do Evento</h3>
                                </div>
                                <div className="nova-pauta-field-premium">
                                    <label className="field-label-premium">Nome do Evento / Data Especial *</label>
                                    <input
                                        type="text"
                                        className="input-premium title-input-premium"
                                        required
                                        autoFocus
                                        value={newEventTitle}
                                        onChange={e => setNewEventTitle(e.target.value)}
                                        placeholder="Ex: Aniversário da Cidade"
                                    />
                                </div>

                                <div className="fields-grid-2-premium mt-1-premium">
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Data *</label>
                                        <input
                                            type="date"
                                            className="input-premium"
                                            required
                                            value={newEventDate}
                                            onChange={e => setNewEventDate(e.target.value)}
                                        />
                                    </div>
                                    <div className="nova-pauta-field-premium">
                                        <label className="field-label-premium">Tipo de Registro *</label>
                                        <select
                                            className="select-premium"
                                            value={newEventType}
                                            onChange={e => setNewEventType(e.target.value as any)}
                                        >
                                            <option value="comemorativa">Data Comemorativa</option>
                                            <option value="feriado">Feriado</option>
                                            <option value="pauta">Pauta Agendada</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="nova-pauta-footer-premium">
                                <button type="button" className="btn-cancel-premium" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-save-premium">Salvar no Calendário</button>
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
                            setCalendarError('');
                        } catch (error) {
                            setCalendarError('Erro ao atualizar evento. Tente novamente.');
                        }
                    }}
                    onDelete={async (id) => {
                        setConfirmDeleteEventId(id);
                        setSelectedAgendaEvent(null);
                    }}
                />
            )}

            {/* Erro inline do calendário */}
            {calendarError && (
                <div style={{ position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 20px', color: '#991b1b', fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {calendarError}
                    <button onClick={() => setCalendarError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b', padding: 0, marginLeft: 4 }}>✕</button>
                </div>
            )}

            {/* Modal de confirmação de exclusão de evento */}
            {confirmDeleteEventId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setConfirmDeleteEventId(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, padding: '1.75rem', maxWidth: 380, width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Excluir evento</h3>
                        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#64748b' }}>Tem certeza que deseja excluir este evento do calendário?</p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setConfirmDeleteEventId(null)} style={{ padding: '8px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                            <button onClick={async () => { try { await deleteEvent(confirmDeleteEventId); } catch { setCalendarError('Erro ao excluir evento.'); } finally { setConfirmDeleteEventId(null); } }} style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
