import { useState } from 'react';
import { Plus, MoreHorizontal, MessageSquare, Paperclip, Clock, Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, TaskStatus, TaskType } from '../types/kanban';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import CreateInaugurationModal from '../components/CreateInaugurationModal';
import './Dashboard.css';

const COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'solicitado', title: 'Solicitação' },
    { id: 'producao', title: 'Em Produção' },
    { id: 'correcao', title: 'Correção/Aprovação' },
    { id: 'aprovado', title: 'Aprovado' },
    { id: 'publicado', title: 'Publicado' },
    { id: 'cancelado', title: 'Reprovado/Cancelado' },
    { id: 'inauguracao', title: 'Inauguração' }
];

export default function Dashboard() {
    const { tasks, team, loading, updateTaskStatus, updateTask, addTask, archivedTasks, unarchiveTask, searchTerm } = useData();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreateInaugModalOpen, setIsCreateInaugModalOpen] = useState(false);
    const [showArchive, setShowArchive] = useState(false);

    // --- Search Filtering ---
    const filteredTasks = tasks.filter(task => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        // 1. Title & Description
        const matchesContent =
            task.title.toLowerCase().includes(term) ||
            task.description?.toLowerCase().includes(term);
        if (matchesContent) return true;

        // 2. Types/Badges
        const typeLabels: Record<string, string> = {
            'release': 'release pauta',
            'arte': 'arte gráfica design',
            'video': 'vídeo audiovisual',
            'foto': 'fotos fotografia',
            'inauguracao': 'inauguração evento'
        };
        const matchesType = task.type.some(t => typeLabels[t]?.includes(term));
        if (matchesType) return true;

        // 3. Secretarias (any task)
        const matchesSecretaria = task.inauguracao_secretarias?.some(s => s.toLowerCase().includes(term));
        if (matchesSecretaria) return true;

        // 4. Assignees (Team Members)
        const matchesAssignees = task.assignees?.some(name => name.toLowerCase().includes(term));
        if (matchesAssignees) return true;

        // 5. Inauguration specific details
        if (task.status === 'inauguracao' || task.type.includes('inauguracao')) {
            const matchesInaug =
                task.inauguracao_nome?.toLowerCase().includes(term) ||
                task.inauguracao_endereco?.toLowerCase().includes(term);
            if (matchesInaug) return true;
        }

        return false;
    });

    // Helper to format type badge
    const getTypeBadge = (types: TaskType[]) => {
        return (
            <div className="task-badges-container">
                {types.map(t => {
                    switch (t) {
                        case 'release': return <span key={t} className="badge-tag badge-release">📝 Release</span>;
                        case 'arte': return <span key={t} className="badge-tag badge-arte">🎨 Arte Gráfica</span>;
                        case 'video': return <span key={t} className="badge-tag badge-video">🎬 Vídeo</span>;
                        case 'foto': return <span key={t} className="badge-tag badge-foto">📸 Fotos</span>;
                        case 'post': return <span key={t} className="badge-tag badge-post">📱 Post</span>;
                        default: return null;
                    }
                })}
            </div>
        );
    };

    // Helper to format date
    const formatDueDate = (date: Date | null) => {
        if (!date) return null;
        const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString();
        return (
            <span className={`date-badge ${isOverdue ? 'overdue' : ''}`}>
                <Clock size={12} />
                {format(date, "d 'de' MMM", { locale: ptBR })}
            </span>
        );
    };

    // Drag and Drop Flow
    const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: TaskStatus) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';

        // Add data to dataTransfer for easier access in drag over
        e.dataTransfer.setData('taskStatus', taskStatus);

        // Add a slight transparency to original card being dragged
        e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('dragging');
        setDraggedTaskId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetColumnId: TaskStatus) => {
        e.preventDefault();
        if (!draggedTaskId) return;

        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        if (!draggedTask) return;

        // Block dragging from or to the 'inauguracao' column (silently cancel)
        if (targetColumnId === 'inauguracao' && draggedTask.status !== 'inauguracao') return;
        if (draggedTask.status === 'inauguracao' && targetColumnId !== 'inauguracao') return;

        await updateTaskStatus(draggedTaskId, targetColumnId);
    };

    const handleUpdateTask = async (updatedTask: Task) => {
        await updateTask(updatedTask);
        if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);
    };

    const handleCreateTask = async (newTask: Task) => {
        await addTask(newTask);
        setIsCreateModalOpen(false);
    };

    const handleCreateInaugTask = async (newTask: Task) => {
        await addTask(newTask);
        setIsCreateInaugModalOpen(false);
    };

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h1>Gestão de Pautas</h1>
                    <p className="subtitle">Gerencie o fluxo completo das publicações e demandas da SECOM.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                        <Plus size={18} />
                        <span>Nova Pauta</span>
                    </button>
                    <button
                        className="btn-primary btn-inauguracao"
                        onClick={() => setIsCreateInaugModalOpen(true)}
                    >
                        <Plus size={18} />
                        <span>Nova Inauguração</span>
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setShowArchive(v => !v)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: archivedTasks.length === 0 ? 0.5 : 1 }}
                    >
                        <Archive size={16} />
                        Histórico ({archivedTasks.length})
                    </button>
                </div>
            </div>

            <div className="kanban-board">
                {loading && <div style={{ padding: '2rem', width: '100%', textAlign: 'center' }}>Carregando pautas...</div>}
                {!loading && COLUMNS.map((column) => {
                    const columnTasks = filteredTasks.filter(task => task.status === column.id);

                    return (
                        <div
                            key={column.id}
                            className={`kanban-column${column.id === 'inauguracao' ? ' inauguracao-column' : ''}`}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className="column-header" data-status={column.id}>
                                <h2>{column.title}</h2>
                                <span className="task-count">{columnTasks.length}</span>
                            </div>

                            <div className="column-content">
                                {columnTasks.length === 0 && searchTerm ? (
                                    <div className="empty-column-search">Nenhuma pauta encontrada</div>
                                ) : columnTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className={`kanban-card priority-${task.priority}`}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, task.id, task.status)}
                                        onDragEnd={handleDragEnd}
                                        onClick={() => setSelectedTask(task)}
                                    >
                                        <div className="card-header">
                                            {getTypeBadge(task.type)}
                                            <button className="icon-btn-small">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>

                                        <h3 className="card-title">{task.title}</h3>

                                        {/* Secretaria badge — only for non-inauguration cards */}
                                        {task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0 && task.status !== 'inauguracao' && (
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 3,
                                                fontSize: '0.72rem', fontWeight: 600,
                                                padding: '2px 8px', borderRadius: '99px',
                                                background: 'hsl(var(--color-primary) / 0.08)',
                                                color: 'hsl(var(--color-primary))',
                                                border: '1px solid hsl(var(--color-primary) / 0.2)',
                                                marginBottom: '2px'
                                            }}>
                                                🏛️ {task.inauguracao_secretarias.join(', ')}
                                            </span>
                                        )}

                                        {/* Inauguration card: clean summary */}
                                        {task.status === 'inauguracao' ? (() => {
                                            const tipoLabel = task.inauguracao_tipo === 'master' ? 'Master' : 'Simples';

                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', margin: '6px 0' }}>
                                                    {/* Tipo badge */}
                                                    <div>
                                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'hsla(330, 55%, 88%, 1)', color: 'hsl(330, 55%, 38%)', letterSpacing: '0.04em' }}>
                                                            {tipoLabel}
                                                        </span>
                                                    </div>

                                                    {/* Secretaria tags */}
                                                    {task.inauguracao_secretarias && task.inauguracao_secretarias.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                                                            {task.inauguracao_secretarias.map(s => (
                                                                <span key={s} style={{ fontSize: '0.67rem', padding: '1px 6px', borderRadius: '99px', background: 'hsla(330, 50%, 88%, 1)', color: 'hsl(330, 50%, 38%)', border: '1px solid hsla(330, 40%, 80%, 1)' }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Checklist progress */}
                                                    {task.inauguracao_checklist && task.inauguracao_checklist.length > 0 ? (() => {
                                                        const done = task.inauguracao_checklist!.filter(i => i.done).length;
                                                        const total = task.inauguracao_checklist!.length;
                                                        const pct = Math.round((done / total) * 100);
                                                        return (
                                                            <div style={{ marginTop: '2px' }}>
                                                                <div style={{ fontSize: '0.7rem', color: 'hsl(330, 45%, 45%)', fontWeight: 600, marginBottom: '3px', display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>{done === total ? '✅ Checklist completo' : `☑️ Checklist: ${done}/${total}`}</span>
                                                                </div>
                                                                <div style={{ height: '4px', borderRadius: '99px', background: 'hsla(330, 40%, 88%, 1)', overflow: 'hidden' }}>
                                                                    <div style={{ height: '100%', width: `${pct}%`, background: done === total ? 'hsl(140, 55%, 45%)' : 'hsl(330, 55%, 55%)', borderRadius: '99px', transition: 'width 0.3s' }} />
                                                                </div>
                                                            </div>
                                                        );
                                                    })() : (
                                                        <div style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', fontStyle: 'italic' }}>Sem checklist</div>
                                                    )}
                                                </div>
                                            );
                                        })() : (
                                            <p className="card-desc">{task.description}</p>
                                        )}
                                        <div className="card-footer">
                                            <div className="card-meta">
                                                {formatDueDate(task.dueDate)}
                                                {task.comments.length > 0 && (
                                                    <span className="meta-item">
                                                        <MessageSquare size={12} /> {task.comments.length}
                                                    </span>
                                                )}
                                                {task.attachments.length > 0 && (
                                                    <span className="meta-item">
                                                        <Paperclip size={12} /> {task.attachments.length}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="card-assignee">
                                                {(() => {
                                                    const creatorsArray = task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                    const assigneesArray = task.assignees || [];
                                                    const allPeople = Array.from(new Set([...creatorsArray, ...assigneesArray]));

                                                    if (allPeople.length === 0) {
                                                        return (
                                                            <div className="unassigned">
                                                                Equipe não definida
                                                            </div>
                                                        );
                                                    }

                                                    return (
                                                        <div className="team-avatars" style={{ display: 'flex', flexDirection: 'row' }}>
                                                            {allPeople.map((person, index) => {
                                                                const member = team.find(m => m.name === person);
                                                                return member?.avatar_url ? (
                                                                    <img 
                                                                        key={person} 
                                                                        src={member.avatar_url} 
                                                                        alt={person} 
                                                                        className="avatar-small" 
                                                                        style={{ border: `2px solid hsl(var(--color-surface))`, objectFit: 'cover', marginLeft: index > 0 ? '-8px' : '0', width: 28, height: 28, borderRadius: '50%' }}
                                                                        title={person} 
                                                                    />
                                                                ) : (
                                                                    <div key={person} className="avatar-placeholder avatar-small" style={{ border: `2px solid hsl(var(--color-surface))`, background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))', color: '#fff', fontSize: '0.75rem', marginLeft: index > 0 ? '-8px' : '0', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} title={person}>
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
                                ))}

                                <button
                                    className="add-card-btn"
                                    onClick={() => column.id === 'inauguracao'
                                        ? setIsCreateInaugModalOpen(true)
                                        : setIsCreateModalOpen(true)
                                    }
                                >
                                    <Plus size={16} /> Adicionar Cartão
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={handleUpdateTask}
                />
            )}

            {isCreateModalOpen && (
                <CreateTaskModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateTask}
                />
            )}

            {isCreateInaugModalOpen && (
                <CreateInaugurationModal
                    onClose={() => setIsCreateInaugModalOpen(false)}
                    onCreate={handleCreateInaugTask}
                />
            )}

            {/* Archive / History Section */}
            {showArchive && (
                <div className="glass" style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Archive size={18} /> Histórico de Pautas Arquivadas
                    </h2>
                    {archivedTasks.length === 0 ? (
                        <p style={{ color: 'hsl(var(--color-text-muted))', fontSize: '0.9rem' }}>Nenhuma pauta arquivada.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {archivedTasks.map(task => (
                                <div
                                    key={task.id}
                                    className="archived-task-item-premium"
                                    onClick={() => setSelectedTask(task)}
                                >
                                    <div className="archived-task-info-premium">
                                        <p className="archived-task-title-premium">{task.title}</p>
                                        <span className="archived-task-date-premium">
                                            Arquivada em: {task.archived_at ? task.archived_at.toLocaleDateString('pt-BR') : '—'}
                                        </span>
                                    </div>
                                    <button
                                        className="btn-secondary small"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            unarchiveTask(task.id);
                                        }}
                                    >
                                        <RotateCcw size={14} /> Desarquivar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
