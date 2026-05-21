import { useState } from 'react';
import { 
    Clock, Image as ImageIcon, Video, FileText, Building2, 
    AlignEndHorizontal, ExternalLink, ChevronLeft, ChevronRight, Calendar, Sparkles
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import FileViewer from '../components/FileViewer';
import type { Task, Attachment } from '../types/kanban';
import './CronogramaV3.css';

type FilterType = 'todos' | 'foto' | 'video' | 'release' | 'post' | 'inauguracao' | 'arte';

export default function CronogramaV3() {
    const { tasks, team, loading, updateTask } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [viewingFile, setViewingFile] = useState<Attachment | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('todos');

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 }); // Segunda-feira
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i)); // Seg a Dom
        const isCurrentWeek = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 });
    const weekStartFormat = format(days[0], 'dd/MMM', { locale: ptBR });
    const weekEndFormat = format(days[6], 'dd/MMM', { locale: ptBR }); // Até Domingo
    const legendText = isCurrentWeek ? 'SEMANA ATUAL' : `${weekStartFormat} a ${weekEndFormat}`.toUpperCase();


    const filters: { id: FilterType; label: string; icon: any; emoji: string }[] = [
        { id: 'todos', label: 'Todos', icon: AlignEndHorizontal, emoji: '🗒️ Todos' },
        { id: 'inauguracao', label: 'Inauguração', icon: Building2, emoji: '🏛️ Inauguração' },
        { id: 'video', label: 'Vídeo', icon: Video, emoji: '🎬 Vídeo' },
        { id: 'foto', label: 'Foto', icon: ImageIcon, emoji: '📸 Fotos' },
        { id: 'release', label: 'Release', icon: FileText, emoji: '📝 Release' },
        { id: 'post', label: 'Post', icon: FileText, emoji: '📱 Post' },
        { id: 'arte', label: 'Arte', icon: FileText, emoji: '🎨 Arte Gráfica' },
    ];

    return (
        <div className="page-container cronograma-v3-container">
            {/* Header Panel */}
            <div className="cronograma-v3-header glass">
                <div className="cronograma-v3-title-box">
                    <div className="glow-icon-box">
                        <Sparkles size={22} className="text-primary pulse-sparkle" />
                    </div>
                    <div>
                        <h1>Cronograma Semanal <span className="beta-tag">v3.0 Beta</span></h1>
                        <p className="subtitle">Planejamento e controle de publicações de mídias institucionais.</p>
                    </div>
                </div>

                {/* Week Navigation Controls */}
                <div className="week-nav-v3 glass">
                    <button 
                        className="week-nav-btn-v3" 
                        onClick={() => setCurrentDate(prev => addDays(prev, -7))}
                        title="Semana Anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <button 
                        className={`week-nav-today-v3 ${isCurrentWeek ? 'is-today' : ''}`}
                        onClick={() => setCurrentDate(new Date())}
                    >
                        <Calendar size={14} />
                        <span>{legendText}</span>
                    </button>

                    <button 
                        className="week-nav-btn-v3" 
                        onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                        title="Próxima Semana"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Media Filter Chips */}
            <div className="cronograma-v3-filters-row">
                {filters.map((f) => {
                    const isActive = activeFilter === f.id;
                    return (
                        <button
                            key={f.id}
                            className={`filter-chip-v3 filter-${f.id} ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveFilter(f.id)}
                        >
                            <span>{f.emoji}</span>
                        </button>
                    );
                })}
            </div>

            {/* Grid Container */}
            <div className="cronograma-v3-grid">
                {days.map(day => {
                    const dayString = format(day, "yyyy-MM-dd");
                    
                    // Filter tasks for the day and type
                    const dayTasks = tasks.filter(t => {
                        if (t.archived) return false;
                        
                        // Strict filter: must have a publication date set in the POST tab
                        const targetDate = t.post_data_postagem;
                        if (!targetDate || targetDate !== dayString) return false;
                        
                        if (activeFilter !== 'todos') {
                            if (!t.type || !t.type.includes(activeFilter as any)) {
                                return false;
                            }
                        }
                        return true;
                    }).sort((a, b) => {
                        const timeA = a.post_horario_postagem || a.pauta_horario || '';
                        const timeB = b.post_horario_postagem || b.pauta_horario || '';
                        return timeA.localeCompare(timeB);
                    });

                    return (
                        <div key={day.toISOString()} className="cronograma-v3-column glass">
                            <div className="column-header-v3">
                                <h3>{format(day, 'EEEE', { locale: ptBR })}</h3>
                                <span className="column-date-badge-v3">
                                    {format(day, "d 'de' MMM", { locale: ptBR })}
                                </span>
                            </div>

                            <div className="column-tasks-v3">
                                {loading && <div className="state-hint-v3"><span className="loading-spinner-v3" /></div>}
                                {!loading && dayTasks.length === 0 ? (
                                    <div className="cronograma-v3-empty-column">
                                        <span>Sem mídias agendadas</span>
                                    </div>
                                ) : (
                                    !loading && dayTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`cronograma-v3-card clickable priority-${task.priority}`}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <div className="card-inner-v3">
                                                <div className="card-top-badges">
                                                    <div className="media-badges-list">
                                                        {task.type?.includes('video' as any) && (
                                                            <span className="media-badge video">🎬 Vídeo</span>
                                                        )}
                                                        {task.type?.includes('foto' as any) && (
                                                            <span className="media-badge foto">📸 Fotos</span>
                                                        )}
                                                        {task.type?.includes('release' as any) && (
                                                            <span className="media-badge release">📝 Release</span>
                                                        )}
                                                        {task.type?.includes('post' as any) && (
                                                            <span className="media-badge post">📱 Post</span>
                                                        )}
                                                        {task.type?.includes('arte' as any) && (
                                                            <span className="media-badge arte">🎨 Arte</span>
                                                        )}
                                                    </div>
                                                    <div className="external-link-icon-v3">
                                                        <ExternalLink size={12} />
                                                    </div>
                                                </div>

                                                <h4 className="card-title-v3">{task.title}</h4>

                                                {/* Secretariat pills */}
                                                {task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0 && task.status !== 'inauguracao' && (
                                                    <div className="card-secretaria-wrapper">
                                                        <span className="card-secretaria-pill">
                                                            🏛️ {task.inauguracao_secretarias.join(', ')}
                                                        </span>
                                                    </div>
                                                )}

                                                {task.description && (
                                                    <p className="card-desc-v3">{task.description}</p>
                                                )}

                                                <div className="card-footer-v3">
                                                    <div className="post-time-badge">
                                                        <Clock size={11} />
                                                        <span>{task.post_horario_postagem || 'A definir'}</span>
                                                    </div>

                                                    {/* Team avatars overlay */}
                                                    {(() => {
                                                        const creatorsArray = task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                        const assigneesArray = task.assignees || [];
                                                        const allPeople = Array.from(new Set([...creatorsArray, ...assigneesArray]));

                                                        if (allPeople.length === 0) return null;

                                                        return (
                                                            <div className="team-avatars-v3">
                                                                {allPeople.map((person, index) => {
                                                                    const teamMember = team.find(m => m.name === person);
                                                                    return teamMember?.avatar_url ? (
                                                                        <img
                                                                            key={person}
                                                                            src={teamMember.avatar_url}
                                                                            alt={person}
                                                                            className="team-avatar-v3-img"
                                                                            style={{ marginLeft: index > 0 ? '-6px' : '0', zIndex: 10 - index }}
                                                                            title={person}
                                                                        />
                                                                    ) : (
                                                                        <div 
                                                                            key={person} 
                                                                            className="team-avatar-v3-letter"
                                                                            style={{ marginLeft: index > 0 ? '-6px' : '0', zIndex: 10 - index }}
                                                                            title={person}
                                                                        >
                                                                            {person.charAt(0)}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Preview attachment on the right side */}
                                            {(() => {
                                                const firstImage = task.attachments?.find(a => a.type === 'image');
                                                if (!firstImage) return null;
                                                return (
                                                    <div 
                                                        className="card-side-preview-v3"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingFile(firstImage);
                                                        }}
                                                        title="Ver mídia em alta resolução"
                                                    >
                                                        <img src={firstImage.url} alt="Capa" />
                                                        {(task.attachments?.filter(a => a.type === 'image').length || 0) > 1 && (
                                                            <div className="more-attachments-badge">
                                                                <ImageIcon size={10} />
                                                                <span>+{(task.attachments?.filter(a => a.type === 'image').length || 0) - 1}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals Detail */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={(updatedTask) => updateTask(updatedTask)}
                />
            )}

            {viewingFile && (
                <FileViewer
                    attachment={viewingFile}
                    attachments={tasks.find(t => t.attachments?.some(a => a.id === viewingFile.id))?.attachments || []}
                    onClose={() => setViewingFile(null)}
                />
            )}
        </div>
    );
}
