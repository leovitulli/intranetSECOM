import { useState } from 'react';
import { MapPin, Clock, ExternalLink, Building2 } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';

import type { Task } from '../types/kanban';
import './Agenda.css';

export default function Agenda() {
    const { tasks, team, loading, updateTask } = useData();
    const [currentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i)); // Mon to Sun

    return (
        <div className="page-container agenda-page">
            <div className="page-header">
                <div>
                    <h1>Agenda da Equipe Externa</h1>
                    <p className="subtitle">Visão geral de organização das equipes durante a semana.</p>
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
                                    !loading && dayTasks.map(task => {
                                        const isExternal = task.type?.includes('externa' as any);
                                        return (
                                        <div
                                            key={task.id}
                                            className="event-card clickable"
                                            onClick={() => setSelectedTask(task)}
                                            style={{ borderLeft: `4px solid var(--status-${task.status})` }}
                                        >
                                            <div className="card-header" style={{ marginBottom: '8px' }}>
                                                <div className="task-badges-container" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {isExternal && (
                                                        <span className="badge-tag badge-inauguracao">Agenda Externa</span>
                                                    )}
                                                    {task.type?.includes('inauguracao' as any) && !isExternal && (
                                                        <span className="badge-tag badge-inauguracao">
                                                            <Building2 size={12} /> Inauguração
                                                        </span>
                                                    )}
                                                </div>
                                                <button className="icon-btn-small" style={{ opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>

                                            <h3 className="card-title">{task.title}</h3>

                                            {task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0 && task.status !== 'inauguracao' && (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                                    fontSize: '0.72rem', fontWeight: 600,
                                                    padding: '2px 8px', borderRadius: '99px',
                                                    background: 'hsl(var(--color-primary) / 0.08)',
                                                    color: 'hsl(var(--color-primary))',
                                                    border: '1px solid hsl(var(--color-primary) / 0.2)',
                                                    marginBottom: '8px'
                                                }}>
                                                    🏛️ {task.inauguracao_secretarias.join(', ')}
                                                </span>
                                            )}

                                            <div className="event-details" style={{ marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {task.pauta_endereco && (
                                                    <div className="event-location" title="Localização" style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: 'var(--color-text-muted)' }}>
                                                        <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px' }} /> 
                                                        <span style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>{task.pauta_endereco}</span>
                                                    </div>
                                                )}
                                                {task.pauta_saida && (
                                                    <div className="event-departure" title="Horário de Saída do Paço" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        <span>🚗</span> Saída: {task.pauta_saida}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="card-footer" style={{ marginTop: 'auto' }}>
                                                <div className="card-meta">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '12px' }}>
                                                        <Clock size={12} /> {task.pauta_horario || 'Horário a definir'}
                                                    </div>
                                                </div>

                                                <div className="card-assignee">
                                                    {(() => {
                                                        const creatorsArray = task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                        const assigneesArray = task.assignees || [];
                                                        const allPeople = Array.from(new Set([...creatorsArray, ...assigneesArray]));

                                                        if (allPeople.length === 0) {
                                                            return (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Equipe não definida</span>
                                                            );
                                                        }

                                                        return (
                                                            <div className="team-avatars" style={{ display: 'flex', flexDirection: 'row' }}>
                                                                {allPeople.map((person, index) => {
                                                                    const teamMember = team.find(m => m.name === person);
                                                                    return teamMember?.avatar_url ? (
                                                                        <img
                                                                            key={person}
                                                                            src={teamMember.avatar_url}
                                                                            alt={person}
                                                                            className="team-avatar-medium avatar-small"
                                                                            style={{ border: `2px solid #fff`, objectFit: 'cover', marginLeft: index > 0 ? '-8px' : '0', width: 24, height: 24 }}
                                                                            title={person}
                                                                        />
                                                                    ) : (
                                                                        <div key={person} className="avatar-placeholder team-avatar-medium avatar-small" style={{ border: `2px solid #fff`, fontSize: '0.65rem', marginLeft: index > 0 ? '-8px' : '0', width: 24, height: 24 }} title={person}>
                                                                            {person.charAt(0)}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                        );
                                    })
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
