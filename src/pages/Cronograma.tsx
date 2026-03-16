import { useState } from 'react';
import { Users, Clock, Image as ImageIcon, Video, FileText, Building2, AlignEndHorizontal, ExternalLink } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import type { Task } from '../types/kanban';
import './Agenda.css';
import './Cronograma.css';

type FilterType = 'todos' | 'foto' | 'video' | 'release' | 'post' | 'inauguracao' | 'arte';

export default function Cronograma() {
    const { tasks, team, loading, updateTask } = useData();
    const [currentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Segunda-feira
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i)); // Seg a Dom

    // Filtros visuais
    const filters: { id: FilterType; label: string; icon: any; color: string }[] = [
        { id: 'todos', label: 'Todos', icon: AlignEndHorizontal, color: 'var(--color-primary)' },
        { id: 'inauguracao', label: 'Inauguração', icon: Building2, color: 'var(--color-status-inauguracao)' },
        { id: 'video', label: 'Vídeo', icon: Video, color: 'hsl(var(--color-warning))' },
        { id: 'foto', label: 'Foto', icon: ImageIcon, color: 'hsl(var(--color-success))' },
        { id: 'release', label: 'Release', icon: FileText, color: 'hsl(var(--color-info))' },
        { id: 'post', label: 'Post', icon: FileText, color: 'hsl(var(--color-warning))' },
        { id: 'arte', label: 'Arte', icon: FileText, color: 'hsl(var(--color-accent))' },
    ];

    return (
        <div className="page-container agenda-page cronograma-page">
            <div className="page-header">
                <div>
                    <h1>Cronograma Semanal</h1>
                    <p className="subtitle">Visão geral de todas as pautas planejadas para a semana atual.</p>
                    
                    {/* Filtros Rápidos */}
                    <div className="cronograma-filters" style={{ display: 'flex', gap: '8px', marginTop: '1rem', flexWrap: 'wrap' }}>
                        {filters.map(f => {
                            const isActive = activeFilter === f.id;
                            let badgeClass = '';
                            let filterLabel = f.label;
                            if (f.id === 'todos') {
                                badgeClass = 'badge-tag badge-todos';
                            } else {
                                const typeMap: Record<string, string> = {
                                    'foto': 'foto',
                                    'video': 'video',
                                    'release': 'release',
                                    'post': 'post',
                                    'inauguracao': 'inauguracao',
                                    'arte': 'arte'
                                };
                                badgeClass = `badge-tag badge-${typeMap[f.id]}`;
                                if (f.id === 'release') filterLabel = '📝 Release';
                                if (f.id === 'post') filterLabel = '📱 Post';
                                if (f.id === 'arte') filterLabel = '🎨 Arte Gráfica';
                                if (f.id === 'video') filterLabel = '🎬 Vídeo';
                                if (f.id === 'foto') filterLabel = '📸 Fotos';
                                if (f.id === 'inauguracao') filterLabel = 'Inauguração';
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
                                    onClick={() => setActiveFilter(f.id)}
                                >
                                    {f.id === 'todos' && <AlignEndHorizontal size={14} style={{ marginRight: '4px' }} />}
                                    {f.id === 'inauguracao' && <Building2 size={12} style={{ marginRight: '4px' }} />}
                                    {filterLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="agenda-grid">
                {days.map(day => {
                    const dayString = format(day, "yyyy-MM-dd");
                    
                    // Filtrar as tasks pelo dia E pelo filtro selecionado
                    const dayTasks = tasks.filter(t => {
                        if (t.archived) return false;
                        if (t.pauta_data !== dayString) return false;
                        
                        if (activeFilter !== 'todos') {
                            if (!t.type || !t.type.includes(activeFilter as any)) {
                                return false;
                            }
                        }
                        return true;
                    }).sort((a, b) => (a.pauta_horario || '').localeCompare(b.pauta_horario || ''));

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
                                            <div className="card-header" style={{ marginBottom: '8px' }}>
                                                <div className="task-badges-container" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {task.type?.includes('video' as any) && (
                                                        <span className="badge-tag badge-video">🎬 Vídeo</span>
                                                    )}
                                                    {task.type?.includes('foto' as any) && (
                                                        <span className="badge-tag badge-foto">📸 Fotos</span>
                                                    )}
                                                    {task.type?.includes('release' as any) && (
                                                        <span className="badge-tag badge-release">📝 Release</span>
                                                    )}
                                                    {task.type?.includes('post' as any) && (
                                                        <span className="badge-tag badge-post">📱 Post</span>
                                                    )}
                                                    {task.type?.includes('arte' as any) && (
                                                        <span className="badge-tag badge-arte">🎨 Arte Gráfica</span>
                                                    )}
                                                </div>
                                                <button className="icon-btn-small" style={{ opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>

                                            <h4 className="card-title event-title" style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{task.title}</h4>

                                            {/* Pílula de Secretaria */}
                                            {task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0 && task.status !== 'inauguracao' && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                                        fontSize: '0.72rem', fontWeight: 600,
                                                        padding: '2px 8px', borderRadius: '99px',
                                                        background: 'hsl(var(--color-primary) / 0.08)',
                                                        color: 'hsl(var(--color-primary))',
                                                        border: '1px solid hsl(var(--color-primary) / 0.2)'
                                                    }}>
                                                        🏛️ {task.inauguracao_secretarias.join(', ')}
                                                    </span>
                                                </div>
                                            )}

                                            {task.description && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.description}
                                                </div>
                                            )}

                                            <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0, marginTop: '8px' }}>
                                                <div className="event-time" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: '12px' }}>
                                                    <Clock size={12} /> {task.pauta_horario || 'Horário a definir'}
                                                </div>
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
