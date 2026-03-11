import { useState } from 'react';
import { MapPin, Users, Clock, ExternalLink } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import type { Task } from '../types/kanban';
import './Agenda.css';

export default function Agenda() {
    const { tasks, team, loading, updateTask } = useData();
    const [currentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const navigate = useNavigate();

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
                        onClick={() => navigate('/pautas')}
                    >
                        Criar Agenda (Via Pautas)
                    </button>
                </div>
            </div>

            <div className="agenda-grid">
                {days.map(day => {
                    const dayString = format(day, "yyyy-MM-dd");
                    const dayTasks = tasks.filter(t => t.pauta_data === dayString && t.is_pauta_externa && !t.archived)
                        .sort((a, b) => (a.pauta_horario || '').localeCompare(b.pauta_horario || ''));

                    return (
                        <div key={day.toISOString()} className={`agenda-day`}>
                            <div className="day-header" style={{ padding: '1.25rem' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{format(day, 'EEEE', { locale: ptBR })}</h3>
                            </div>

                            <div className="day-events">
                                {loading && <p className="empty-state">Carregando...</p>}
                                {!loading && dayTasks.length === 0 ? (
                                    <div className="no-events text-muted">Agenda livre</div>
                                ) : (
                                    !loading && dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="event-card clickable"
                                            onClick={() => setSelectedTask(task)}
                                            style={{ borderLeft: `4px solid var(--status-${task.status})` }}
                                        >
                                            <div className="event-time">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Clock size={14} /> {task.pauta_horario || 'Horário a definir'}
                                                </div>
                                                <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                            </div>

                                            <h4 className="event-title">{task.title}</h4>

                                            {task.description && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.description}
                                                </div>
                                            )}

                                            {task.type?.includes('inauguracao' as any) && (
                                                <div className="event-mayor-badge" style={{ marginBottom: '0.75rem' }}>
                                                    <span className="mayor-dot" style={{ background: 'var(--color-status-inauguracao)' }}></span> Inauguração
                                                </div>
                                            )}

                                            <div className="event-details">
                                                {task.pauta_endereco && (
                                                    <div className="event-location" title="Localização">
                                                        <MapPin size={14} /> {task.pauta_endereco}
                                                    </div>
                                                )}
                                                {task.pauta_saida && (
                                                    <div className="event-departure" title="Horário de Saída do Paço">
                                                        <span>🚗</span> Saída: {task.pauta_saida}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="event-team" style={{ marginTop: '0.75rem' }}>
                                                <Users size={14} />
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div className="team-avatars">
                                                        {task.assignees.map(assigneeName => {
                                                            const teamMember = team.find(m => m.name === assigneeName);
                                                            const avatarSrc = teamMember?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(assigneeName)}&background=random`;
                                                            return (
                                                                <img
                                                                    key={assigneeName}
                                                                    src={avatarSrc}
                                                                    alt={assigneeName}
                                                                    className="team-avatar-medium"
                                                                    style={{ border: `2px solid ${teamMember?.color || '#fff'}`, objectFit: 'cover' }}
                                                                    title={assigneeName}
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Equipe não definida</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={(updatedTask) => updateTask(updatedTask)}
                />
            )}
        </div>
    );
}
