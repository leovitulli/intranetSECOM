import { useState } from 'react';
import { Plus, MoreHorizontal, MessageSquare, Paperclip, Clock, Archive, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, TaskStatus, TaskType } from '../types/kanban';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskTeamAvatars from '../components/TaskTeamAvatars';
import './Dashboard.css';

const FLOW_COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'solicitado',  title: 'Solicitação' },
    { id: 'producao',    title: 'Em Produção' },
    { id: 'correcao',    title: 'Correção/Aprovação' },
    { id: 'aprovado',    title: 'Aprovado' },
    { id: 'publicado',   title: 'Publicado' },
    { id: 'cancelado',   title: 'Reprovado/Cancelado' },
];

// ── Regra da coluna espelho de Inauguração ────────────────────────────────────
// Aparece quando: type inclui inauguracao + aba preenchida + não arquivado.
const isInaugCard = (task: Task) =>
    !task.archived &&
    task.type.includes('inauguracao') &&
    !!(task.inauguracao_tipo || task.inauguracao_checklist?.length);

export default function Dashboard() {
    const { user } = useAuth();
    const { tasks, team, loading, updateTaskStatus, updateTask, addTask, archivedTasks, unarchiveTask, searchTerm } = useData();
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showArchive, setShowArchive] = useState(false);

    // ── Filtro de busca ───────────────────────────────────────────────────────
    const filteredTasks = tasks.filter(task => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        if (task.title.toLowerCase().includes(term)) return true;
        if (task.description?.toLowerCase().includes(term)) return true;

        const typeLabels: Record<string, string> = {
            release: 'release pauta',
            arte: 'arte gráfica design',
            video: 'vídeo audiovisual',
            foto: 'fotos fotografia',
            inauguracao: 'inauguração evento',
        };
        if (task.type.some(t => typeLabels[t]?.includes(term))) return true;
        if (task.inauguracao_secretarias?.some(s => s.toLowerCase().includes(term))) return true;
        if (task.secretarias?.some(s => s.toLowerCase().includes(term))) return true;
        if (task.assignees?.some(n => n.toLowerCase().includes(term))) return true;
        if (task.inauguracao_nome?.toLowerCase().includes(term)) return true;
        if (task.inauguracao_endereco?.toLowerCase().includes(term)) return true;

        return false;
    });

    // ── Badges de tipo ────────────────────────────────────────────────────────
    // Regra: badge de inauguração só aparece se a aba tiver campos preenchidos.
    // As outras abas ainda usam só task.type (a ser refinado aba a aba futuramente).
    const getTypeBadge = (types: TaskType[], task: Task) => (
        <div className="task-badges-container">
            {types.map(t => {
                switch (t) {
                    case 'release':     return <span key={t} className="badge-tag badge-release">📝 Release</span>;
                    case 'arte':        return <span key={t} className="badge-tag badge-arte">🎨 Arte Gráfica</span>;
                    case 'video':       return <span key={t} className="badge-tag badge-video">🎬 Vídeo</span>;
                    case 'foto':        return <span key={t} className="badge-tag badge-foto">📸 Fotos</span>;
                    case 'post':        return <span key={t} className="badge-tag badge-post">📱 Post</span>;
                    case 'inauguracao':
                        // Só mostra se a aba de inauguração tiver sido preenchida
                        return isInaugCard(task)
                            ? <span key={t} className="badge-tag badge-inauguracao">🏛️ Inauguração</span>
                            : null;
                    default: return null;
                }
            })}
        </div>
    );

    // ── Formatação de data ────────────────────────────────────────────────────
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

    // ── Drag & Drop ───────────────────────────────────────────────────────────
    const handleDragStart = (e: React.DragEvent, taskId: string, taskStatus: TaskStatus) => {
        setDraggedTaskId(taskId);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('taskStatus', taskStatus);
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
        await updateTaskStatus(draggedTaskId, targetColumnId);
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleUpdateTask = async (updatedTask: Task) => {
        await updateTask(updatedTask);
        if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);
    };

    const handleCreateTask = async (newTask: Task): Promise<boolean> => {
        const success = await addTask(newTask);
        if (success) setIsCreateModalOpen(false);
        return success;
    };

    // ── Card de inauguração (espelho na coluna Inauguração) ───────────────────
    const renderInaugCard = (task: Task) => {
        const tipoLabel = task.inauguracao_tipo === 'master' ? 'Master' : 'Simples';
        const checklist = task.inauguracao_checklist || [];
        const done = checklist.filter(i => i.done).length;
        const total = checklist.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        const secretarias = task.inauguracao_secretarias || task.secretarias || [];

        return (
            <div
                key={`inaug-${task.id}`}
                className="kanban-card priority-alta"
                style={{ borderLeft: '3px solid hsl(330, 55%, 55%)', cursor: 'pointer' }}
                onClick={() => setSelectedTask(task)}
            >
                <div className="card-header">
                    <div className="task-badges-container">
                        <span className="badge-tag badge-inauguracao">🏛️ Inauguração</span>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 7px', borderRadius: '99px', background: 'hsla(330,55%,88%,1)', color: 'hsl(330,55%,38%)' }}>
                            {tipoLabel}
                        </span>
                    </div>
                    <button className="icon-btn-small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }}>
                        <MoreHorizontal size={16} />
                    </button>
                </div>

                <h3 className="card-title">{task.title}</h3>

                {/* Secretarias */}
                {secretarias.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, margin: '4px 0' }}>
                        {secretarias.map(s => (
                            <span key={s} style={{ fontSize: '0.67rem', padding: '1px 6px', borderRadius: '99px', background: 'hsla(330,50%,88%,1)', color: 'hsl(330,50%,38%)', border: '1px solid hsla(330,40%,80%,1)' }}>
                                {s}
                            </span>
                        ))}
                    </div>
                )}

                {/* Status da pauta de origem */}
                <div style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', marginBottom: 4 }}>
                    Status da pauta: <strong style={{ color: 'hsl(var(--color-text))' }}>{task.status.toUpperCase()}</strong>
                </div>

                {/* Checklist */}
                {total > 0 && (
                    <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: '0.7rem', color: 'hsl(330,45%,45%)', fontWeight: 600, marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                            <span>{done === total ? '✅ Checklist completo' : `☑️ ${done}/${total}`}</span>
                            <span>{pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: 'hsla(330,40%,88%,1)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: done === total ? 'hsl(140,55%,45%)' : 'hsl(330,55%,55%)', borderRadius: 99, transition: 'width 0.3s' }} />
                        </div>
                    </div>
                )}

                <div className="card-footer" style={{ marginTop: 8 }}>
                    <div className="card-meta">{formatDueDate(task.dueDate)}</div>
                    <TaskTeamAvatars task={task} team={team} />
                </div>
            </div>
        );
    };

    // ── Card normal ───────────────────────────────────────────────────────────
    const renderCard = (task: Task) => (
        <div
            key={task.id}
            className={`kanban-card priority-${task.priority}`}
            draggable={user?.role !== 'viewer'}
            onDragStart={e => handleDragStart(e, task.id, task.status)}
            onDragEnd={handleDragEnd}
            onClick={() => setSelectedTask(task)}
        >
            <div className="card-header">
                {getTypeBadge(task.type, task)}
                <button className="icon-btn-small">
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <h3 className="card-title">{task.title}</h3>

            {/* Secretaria badge */}
            {(task.secretarias || task.inauguracao_secretarias || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
                    {(task.secretarias || task.inauguracao_secretarias || []).map(s => (
                        <span key={s} style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '99px',
                            background: 'hsl(var(--color-primary) / 0.08)',
                            color: 'hsl(var(--color-primary))',
                            border: '1px solid hsl(var(--color-primary) / 0.2)',
                        }}>
                            🏛️ {s}
                        </span>
                    ))}
                </div>
            )}

            <p className="card-desc">{task.description}</p>

            <div className="card-footer">
                <div className="card-meta">
                    {formatDueDate(task.dueDate)}
                    {task.comments.length > 0 && (
                        <span className="meta-item"><MessageSquare size={12} /> {task.comments.length}</span>
                    )}
                    {task.attachments.length > 0 && (
                        <span className="meta-item"><Paperclip size={12} /> {task.attachments.length}</span>
                    )}
                </div>
                <TaskTeamAvatars task={task} team={team} />
            </div>
        </div>
    );

    // ── Tasks da coluna Inauguração (espelho) ─────────────────────────────────
    const inaugTasks = filteredTasks.filter(isInaugCard);

    return (
        <div className="dashboard-container">
            <div className="page-header dashboard-header-premium">
                <div>
                    <h1 className="title">Gestão de Pautas</h1>
                    <p className="subtitle">Acompanhe e organize as demandas da SECOM</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {user?.role !== 'viewer' && (
                        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
                            <Plus size={18} />
                            <span>Nova Pauta</span>
                        </button>
                    )}
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
                {loading && (
                    <div style={{ padding: '2rem', width: '100%', textAlign: 'center' }}>
                        Carregando pautas...
                    </div>
                )}

                {/* ── Colunas do fluxo normal ── */}
                {!loading && FLOW_COLUMNS.map(column => {
                    const columnTasks = filteredTasks.filter(t => t.status === column.id && !t.archived);

                    return (
                        <div
                            key={column.id}
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDrop={e => handleDrop(e, column.id)}
                        >
                            <div className="column-header" data-status={column.id}>
                                <h2>{column.title}</h2>
                                <span className="task-count">{columnTasks.length}</span>
                            </div>
                            <div className="column-content">
                                {columnTasks.length === 0 && searchTerm ? (
                                    <div className="empty-column-search">Nenhuma pauta encontrada</div>
                                ) : (
                                    columnTasks.map(renderCard)
                                )}
                                {user?.role !== 'viewer' && (
                                    <button className="add-card-btn" onClick={() => setIsCreateModalOpen(true)}>
                                        <Plus size={16} /> Adicionar Cartão
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* ── Coluna Inauguração (espelho) ── */}
                {!loading && (
                    <div className="kanban-column inauguracao-column">
                        <div className="column-header" data-status="inauguracao">
                            <h2>Inauguração</h2>
                            <span className="task-count">{inaugTasks.length}</span>
                        </div>
                        <div className="column-content">
                            {inaugTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'hsl(330,40%,60%)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                    Pautas com a aba de Inauguração preenchida aparecerão aqui automaticamente.
                                </div>
                            ) : (
                                inaugTasks.map(renderInaugCard)
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Histórico ── */}
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
                                        onClick={e => { e.stopPropagation(); unarchiveTask(task.id); }}
                                    >
                                        <RotateCcw size={14} /> Desarquivar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Modais ── */}
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
        </div>
    );
}
