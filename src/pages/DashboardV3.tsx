import { useState, useEffect } from 'react';
import { 
    Plus, MoreHorizontal, MessageSquare, Paperclip, Clock, Archive, RotateCcw, 
    Kanban as KanbanIcon, List as ListIcon, ChevronDown, ChevronRight, 
    X, Trash2 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task, TaskStatus, TaskType } from '../types/kanban';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TaskModal from '../components/TaskModal';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskTeamAvatars from '../components/TaskTeamAvatars';
import { normalizeText } from '../utils/searchUtils';
import './DashboardV3.css';

const FLOW_COLUMNS: { id: TaskStatus; title: string }[] = [
    { id: 'solicitado',  title: 'Solicitação' },
    { id: 'producao',    title: 'Em Produção' },
    { id: 'correcao',    title: 'Correção/Aprovação' },
    { id: 'aprovado',    title: 'Aprovado' },
    { id: 'publicado',   title: 'Publicado' },
    { id: 'cancelado',   title: 'Reprovado/Cancelado' },
];

const isInaugCard = (task: Task) =>
    !task.archived &&
    task.type.includes('inauguracao') &&
    !!(task.inauguracao_tipo || task.inauguracao_checklist?.length);

export const getTaskResolvedDateString = (task: Task): string => {
    let date: Date | null = null;
    if (task.dueDate) {
        date = new Date(task.dueDate);
    } else if (task.type?.includes('post') && task.post_data_postagem) {
        date = new Date(task.post_data_postagem + 'T12:00:00');
    } else if (task.pauta_data) {
        date = new Date(task.pauta_data + 'T12:00:00');
    } else if (task.inauguracao_data) {
        date = new Date(task.inauguracao_data);
    } else if (task.type?.includes('video') && task.video_captacao_data) {
        date = new Date(task.video_captacao_data);
    } else if (task.type?.includes('arte') && task.arte_entrega_data) {
        date = new Date(task.arte_entrega_data);
    }

    if (!date || isNaN(date.getTime())) {
        return 'Sem Prazo';
    }

    try {
        return format(date, 'yyyy-MM-dd');
    } catch {
        return 'Sem Prazo';
    }
};

export const formatGroupDateHeader = (dateStr: string): string => {
    if (dateStr === 'Sem Prazo') {
        return '📂 Sem Prazo Definido';
    }
    try {
        const date = new Date(dateStr + 'T12:00:00');
        const weekdayAndDay = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
        let formatted = weekdayAndDay.charAt(0).toUpperCase() + weekdayAndDay.slice(1);
        
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
        
        if (dateStr === todayStr) {
            formatted += ' (Hoje)';
        } else if (dateStr === tomorrowStr) {
            formatted += ' (Amanhã)';
        } else if (dateStr === yesterdayStr) {
            formatted += ' (Ontem)';
        }
        
        return `📅 ${formatted}`;
    } catch {
        return `📅 ${dateStr}`;
    }
};

export const getLeadTimeLabel = (task: Task) => {
    if (!task.createdAt) return null;
    
    const start = new Date(task.createdAt).getTime();
    // If finished, try to use archived_at, else just show it as resolved roughly now
    const end = (task.status === 'publicado' || task.status === 'cancelado') && task.archived_at
        ? new Date(task.archived_at).getTime()
        : Date.now();
        
    const isResolved = task.status === 'publicado' || task.status === 'cancelado';

    if (isResolved) {
        const endDateObj = task.archived_at ? new Date(task.archived_at) : new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
        const dataFormatada = formatter.format(endDateObj).replace('.', '');
        return { label: `Concluída em ${dataFormatada}`, isResolved };
    }

    const diffHours = Math.floor((end - start) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
        return { label: `Aberta há ${diffDays} dia${diffDays > 1 ? 's' : ''}`, isResolved };
    } else {
        return { label: `Aberta há ${diffHours} hora${diffHours !== 1 ? 's' : ''}`, isResolved };
    }
};

export default function DashboardV3() {
    const { user } = useAuth();
    const { 
        tasks, team, loading, updateTaskStatus, updateTask, addTask, deleteTask,
        archivedTasks, unarchiveTask, archiveTask, searchTerm, secretarias 
    } = useData();

    // ─── Estados da Interface v3.0 ──────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<'kanban' | 'table'>(() => {
        const stored = localStorage.getItem('v3_active_tab');
        return (stored as 'kanban' | 'table') || 'kanban';
    });
    
    const [tableGroupBy, setTableGroupBy] = useState<'secretaria' | 'data'>(() => {
        const stored = localStorage.getItem('v3_table_group_by');
        return (stored as 'secretaria' | 'data') || 'secretaria';
    });
    
    const [collapsedColumns, setCollapsedColumns] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('v3_collapsed_columns');
        if (stored) return JSON.parse(stored);
        // Default: Concluídos e cancelados começam fechados para economizar espaço
        return {
            solicitado: false,
            producao: false,
            correcao: false,
            aprovado: false,
            publicado: true,
            cancelado: true,
            inauguracao: true
        };
    });

    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
        const stored = localStorage.getItem('v3_collapsed_groups');
        return stored ? JSON.parse(stored) : {};
    });

    // Filtros rápidos
    const [selectedSec, setSelectedSec] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('');
    const [selectedTypes, setSelectedTypes] = useState<TaskType[]>([]);

    // Gaveta Lateral e Modais
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [quickTitle, setQuickTitle] = useState<Record<string, string>>({});

    // Persistência local
    useEffect(() => {
        localStorage.setItem('v3_active_tab', activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('v3_collapsed_columns', JSON.stringify(collapsedColumns));
    }, [collapsedColumns]);

    useEffect(() => {
        localStorage.setItem('v3_collapsed_groups', JSON.stringify(collapsedGroups));
    }, [collapsedGroups]);

    // ─── Lógica de Filtros Combinados ──────────────────────────────────────────
    const filteredTasks = tasks.filter(task => {
        // 1. Termo de Busca (Global da header)
        if (searchTerm) {
            const term = normalizeText(searchTerm);
            const matchesText = 
                normalizeText(task.title).includes(term) ||
                normalizeText(task.description).includes(term) ||
                task.secretarias?.some(s => normalizeText(s).includes(term)) ||
                task.inauguracao_secretarias?.some(s => normalizeText(s).includes(term)) ||
                task.assignees?.some(n => normalizeText(n).includes(term)) ||
                (task.inauguracao_nome && normalizeText(task.inauguracao_nome).includes(term));
            
            if (!matchesText) return false;
        }

        // 2. Filtro de Secretaria
        if (selectedSec) {
            const hasSec = task.secretarias?.includes(selectedSec) || task.inauguracao_secretarias?.includes(selectedSec);
            if (!hasSec) return false;
        }

        // 3. Filtro de Prioridade
        if (selectedPriority && task.priority !== selectedPriority) {
            return false;
        }

        // 4. Filtro de Tipo de Demanda (Múltiplo)
        if (selectedTypes.length > 0 && !task.type.some(t => selectedTypes.includes(t))) {
            return false;
        }

        return true;
    });

    const activeFiltersCount = 
        (selectedSec ? 1 : 0) + 
        (selectedPriority ? 1 : 0) + 
        selectedTypes.length;

    const clearFilters = () => {
        setSelectedSec('');
        setSelectedPriority('');
        setSelectedTypes([]);
    };

    const toggleTypeFilter = (type: TaskType) => {
        setSelectedTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    // ─── Drag & Drop Lógica ──────────────────────────────────────────────────
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

    // ─── Handlers de Modais ───────────────────────────────────────────────────
    const handleUpdateTask = async (updatedTask: Task) => {
        await updateTask(updatedTask);
        if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);
    };

    const handleCreateTask = async (newTask: Task, teamIds?: string[]): Promise<{ success: boolean; error?: any }> => {
        const result = await addTask(newTask, teamIds);
        if (result.success) {
            setIsCreateModalOpen(false);
        }
        return result;
    };

    const handleQuickAddSubmit = async (groupName: string, e: React.FormEvent) => {
        e.preventDefault();
        const title = quickTitle[groupName]?.trim();
        if (!title) return;

        const newPauta: Omit<Task, 'id'> = {
            title,
            description: '',
            status: 'solicitado',
            creator: user?.name || 'Desconhecido',
            priority: 'media',
            type: selectedTypes.length > 0 ? [selectedTypes[0]] : ['release'],
            assignees: [],
            secretarias: [],
            comments: [],
            attachments: [],
            createdAt: new Date(),
            dueDate: null
        };

        if (tableGroupBy === 'secretaria') {
            newPauta.secretarias = groupName !== 'Demais Demandas' ? [groupName] : [];
        } else {
            if (groupName !== 'Sem Prazo') {
                newPauta.pauta_data = groupName;
                newPauta.dueDate = new Date(groupName + 'T12:00:00');
            }
        }

        const result = await addTask(newPauta);
        if (result.success) {
            setQuickTitle(prev => ({ ...prev, [groupName]: '' }));
        }
    };

    // ─── Formatação Inteligente de Data ───────────────────────────────────────
    const formatDueDate = (task: Task) => {
        if (task.status === 'publicado' || task.status === 'cancelado') return null;

        let date = task.dueDate;
        if (!date) {
            if (task.type?.includes('post') && task.post_data_postagem) {
                date = new Date(task.post_data_postagem + 'T12:00:00');
            } else if (task.pauta_data) {
                date = new Date(task.pauta_data + 'T12:00:00');
            } else if (task.inauguracao_data) {
                date = task.inauguracao_data;
            } else if (task.type?.includes('video') && task.video_captacao_data) {
                date = task.video_captacao_data;
            } else if (task.type?.includes('arte') && task.arte_entrega_data) {
                date = task.arte_entrega_data;
            }
        }
        if (!date) return null;

        const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString();
        return (
            <span className={`date-badge ${isOverdue ? 'overdue' : ''}`}>
                <Clock size={12} />
                {format(date, "d 'de' MMM", { locale: ptBR })}
            </span>
        );
    };

    // ─── Colapsadores ──────────────────────────────────────────────────────────
    const toggleColumn = (colId: string) => {
        setCollapsedColumns(prev => ({ ...prev, [colId]: !prev[colId] }));
    };

    const toggleGroup = (groupName: string) => {
        setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
    };

    // ─── Badges de Tipo ────────────────────────────────────────────────────────
    const getTypeBadge = (types: TaskType[], task: Task) => (
        <div className="task-badges-container">
            {types.map(t => {
                switch (t) {
                    case 'release':     return <span key={t} className="badge-tag badge-release">📝 Release</span>;
                    case 'arte':        return <span key={t} className="badge-tag badge-arte">🎨 Arte</span>;
                    case 'video':       return <span key={t} className="badge-tag badge-video">🎬 Vídeo</span>;
                    case 'foto':        return <span key={t} className="badge-tag badge-foto">📸 Foto</span>;
                    case 'post':        return <span key={t} className="badge-tag badge-post">📱 Post</span>;
                    case 'inauguracao':
                        return isInaugCard(task)
                            ? <span key={t} className="badge-tag badge-inauguracao">🏛️ Inauguração</span>
                            : null;
                    default: return null;
                }
            })}
        </div>
    );

    // ─── Rendering Helpers ───────────────────────────────────────────────────
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
                <button className="icon-btn-small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }}>
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <h3 className="card-title">{task.title}</h3>

            {(task.secretarias || task.inauguracao_secretarias || []).length > 0 && (
                <div className="card-secretaria-list">
                    {(task.secretarias || task.inauguracao_secretarias || []).map(s => (
                        <span key={s} className="card-sec-pill">🏛️ {s}</span>
                    ))}
                </div>
            )}

            <p className="card-desc">{task.description || 'Sem descrição cadastrada.'}</p>

            <div className="card-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <div className="card-meta">
                        {formatDueDate(task)}
                        {task.comments.length > 0 && (
                            <span className="meta-item"><MessageSquare size={12} /> {task.comments.length}</span>
                        )}
                        {task.attachments.length > 0 && (
                            <span className="meta-item"><Paperclip size={12} /> {task.attachments.length}</span>
                        )}
                    </div>
                    <TaskTeamAvatars task={task} team={team} />
                </div>
                {getLeadTimeLabel(task) && (
                    <div style={{ width: '100%', marginTop: '2px' }}>
                        <span className={`badge-lead-time ${getLeadTimeLabel(task)?.isResolved ? 'resolved' : 'in-progress'}`} style={{ width: 'fit-content' }}>
                            {getLeadTimeLabel(task)?.isResolved ? '✅' : '⏳'} {getLeadTimeLabel(task)?.label}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );

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
                className="kanban-card priority-alta card-inauguracao-glow"
                onClick={() => setSelectedTask(task)}
            >
                <div className="card-header">
                    <div className="task-badges-container">
                        <span className="badge-tag badge-inauguracao">🏛️ Inauguração</span>
                        <span className="inaug-tipo-tag">{tipoLabel}</span>
                    </div>
                    <button className="icon-btn-small" onClick={e => { e.stopPropagation(); setSelectedTask(task); }}>
                        <MoreHorizontal size={16} />
                    </button>
                </div>

                <h3 className="card-title">{task.title}</h3>

                {secretarias.length > 0 && (
                    <div className="card-secretaria-list">
                        {secretarias.map(s => (
                            <span key={s} className="card-sec-pill special-inaug">🏛️ {s}</span>
                        ))}
                    </div>
                )}

                <div className="inaug-status-hint">
                    Origem: <strong>{task.status.toUpperCase()}</strong>
                </div>

                {total > 0 && (
                    <div className="inaug-progress-box">
                        <div className="inaug-progress-meta">
                            <span>{done === total ? '✅ Checklist Completo' : `☑️ ${done}/${total}`}</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="inaug-progress-bar-track">
                            <div className={`inaug-progress-bar-fill ${done === total ? 'done' : ''}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                )}

                <div className="card-footer" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="card-meta">{formatDueDate(task)}</div>
                        <TaskTeamAvatars task={task} team={team} />
                    </div>
                </div>
            </div>
        );
    };

    // ─── Agrupamento de Tarefas para Visualização em Tabela ─────────────────────
    const inaugTasks = filteredTasks.filter(isInaugCard);
    
    // Lista de Agrupamento Dinâmico
    let groupNames: string[] = [];
    const tasksByGroup: Record<string, Task[]> = {};

    if (tableGroupBy === 'secretaria') {
        groupNames = [
            ...secretarias.map(s => s.nome),
            'Demais Demandas'
        ];
        groupNames.forEach(name => { tasksByGroup[name] = []; });
        
        filteredTasks.filter(t => !t.archived).forEach(task => {
            const taskSecs = task.secretarias || task.inauguracao_secretarias || [];
            if (taskSecs.length === 0) {
                tasksByGroup['Demais Demandas'].push(task);
            } else {
                taskSecs.forEach(sec => {
                    if (tasksByGroup[sec]) {
                        tasksByGroup[sec].push(task);
                    } else {
                        tasksByGroup[sec] = [task];
                    }
                });
            }
        });

        // Garantir que secretarias legadas não presentes na lista oficial apareçam
        Object.keys(tasksByGroup).forEach(name => {
            if (!groupNames.includes(name)) {
                const idx = groupNames.indexOf('Demais Demandas');
                if (idx !== -1) {
                    groupNames.splice(idx, 0, name);
                } else {
                    groupNames.push(name);
                }
            }
        });
    } else {
        // Agrupar por Data
        const activeTasks = filteredTasks.filter(t => !t.archived);
        const dateMap = new Map<string, Task[]>();
        const uniqueDatesSet = new Set<string>();

        activeTasks.forEach(task => {
            const dateStr = getTaskResolvedDateString(task);
            uniqueDatesSet.add(dateStr);
            if (!dateMap.has(dateStr)) {
                dateMap.set(dateStr, []);
            }
            dateMap.get(dateStr)!.push(task);
        });

        const sortedDates = Array.from(uniqueDatesSet).sort((a, b) => {
            if (a === 'Sem Prazo') return 1;
            if (b === 'Sem Prazo') return -1;
            return a.localeCompare(b);
        });

        groupNames = sortedDates;
        groupNames.forEach(name => {
            tasksByGroup[name] = dateMap.get(name) || [];
        });
    }

    return (
        <div className="dashboard-container dashboard-v3-root">
            {/* Header Superior Premium */}
            <div className="page-header dashboard-header-premium glass">
                <div>
                    <div className="beta-badge-glow">v3.0 BETA</div>
                    <h1 className="title text-gradient">Aura Gestão de Pautas</h1>
                    <p className="subtitle">Visão integrada e painel dinâmico da Comunicação</p>
                </div>
                <div className="header-actions-premium">
                    <div className="v3-view-toggle glass">
                        <button 
                            className={`toggle-btn ${activeTab === 'kanban' ? 'active' : ''}`}
                            onClick={() => setActiveTab('kanban')}
                            title="Quadro Kanban"
                        >
                            <KanbanIcon size={16} />
                            <span>Kanban</span>
                        </button>
                        <button 
                            className={`toggle-btn ${activeTab === 'table' ? 'active' : ''}`}
                            onClick={() => setActiveTab('table')}
                            title="Tabela de Produtividade"
                        >
                            <ListIcon size={16} />
                            <span>Tabela</span>
                        </button>
                    </div>

                    {user?.role !== 'viewer' && (
                        <button className="btn-primary-v3 ripple" onClick={() => setIsCreateModalOpen(true)}>
                            <Plus size={18} />
                            <span>Nova Pauta</span>
                        </button>
                    )}
                    <button 
                        className="btn-secondary-v3 history-trigger" 
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <Archive size={16} />
                        <span>Histórico ({archivedTasks.length})</span>
                    </button>
                </div>
            </div>

            {/* Painel de Filtros Avançados (Estilo Glassmorphic) */}
            <div className="filter-panel-v3 glass">
                <div className="filter-row">
                    <div className="filter-item">
                        <label>🏛️ Secretaria</label>
                        <select 
                            value={selectedSec} 
                            onChange={e => setSelectedSec(e.target.value)} 
                            className="v3-select"
                        >
                            <option value="">Todas as Secretarias</option>
                            {secretarias.map(s => (
                                <option key={s.id} value={s.nome}>{s.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-item">
                        <label>⚡ Prioridade</label>
                        <select 
                            value={selectedPriority} 
                            onChange={e => setSelectedPriority(e.target.value)} 
                            className="v3-select"
                        >
                            <option value="">Todas as Prioridades</option>
                            <option value="baixa">🟢 Baixa</option>
                            <option value="media">🟡 Média</option>
                            <option value="alta">🔴 Alta</option>
                        </select>
                    </div>

                    <div className="filter-item flex-grow-pills">
                        <label>🏷️ Tipos de Demanda</label>
                        <div className="type-pills-container">
                            {(['release', 'arte', 'video', 'foto', 'post', 'inauguracao'] as TaskType[]).map(type => {
                                const isActive = selectedTypes.includes(type);
                                const labels: Record<string, string> = {
                                    release: '📝 Release', arte: '🎨 Arte', video: '🎬 Vídeo',
                                    foto: '📸 Fotos', post: '📱 Post', inauguracao: '🏛️ Inaugurações'
                                };
                                return (
                                    <button 
                                        key={type}
                                        onClick={() => toggleTypeFilter(type)}
                                        className={`type-pill-btn type-${type} ${isActive ? 'active' : ''}`}
                                    >
                                        {labels[type]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activeFiltersCount > 0 && (
                        <button className="btn-clear-filters" onClick={clearFilters}>
                            <X size={14} /> Limpar ({activeFiltersCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Conteúdo Principal (Chaveamento entre Abas) */}
            <div className="dashboard-content-v3">
                {loading && (
                    <div className="loading-v3">
                        <div className="spinner"></div>
                        <p>Carregando base de pautas em tempo real...</p>
                    </div>
                )}

                {/* VISÃO KANBAN */}
                {!loading && activeTab === 'kanban' && (
                    <div className="kanban-board-v3">
                        {/* Renderizar colunas normais */}
                        {FLOW_COLUMNS.map(column => {
                            const columnTasks = filteredTasks.filter(t => t.status === column.id && !t.archived);
                            const isCollapsed = collapsedColumns[column.id];

                            if (isCollapsed) {
                                return (
                                    <div 
                                        key={column.id} 
                                        className="kanban-column-collapsed glass"
                                        onClick={() => toggleColumn(column.id)}
                                        title="Clique para expandir"
                                    >
                                        <div className="collapsed-column-meta">
                                            <span className="collapsed-badge">{columnTasks.length}</span>
                                        </div>
                                        <h2 className="vertical-title">{column.title}</h2>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={column.id}
                                    className="kanban-column-v3 glass"
                                    onDragOver={handleDragOver}
                                    onDrop={e => handleDrop(e, column.id)}
                                >
                                    <div className="column-header-v3" data-status={column.id}>
                                        <div className="header-title-wrapper">
                                            <h2>{column.title}</h2>
                                            <span className="task-count-badge">{columnTasks.length}</span>
                                        </div>
                                        <button 
                                            className="column-collapse-trigger"
                                            onClick={() => toggleColumn(column.id)}
                                            title="Recolher coluna"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="column-content-v3">
                                        {columnTasks.length === 0 ? (
                                            <div className="empty-column-v3">Nenhuma pauta</div>
                                        ) : (
                                            columnTasks.map(renderCard)
                                        )}
                                        {user?.role !== 'viewer' && (
                                            <button className="add-card-btn-v3" onClick={() => setIsCreateModalOpen(true)}>
                                                <Plus size={16} /> Adicionar Pauta
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Coluna Espelho de Inauguração */}
                        {(() => {
                            const isCollapsed = collapsedColumns['inauguracao'];
                            if (isCollapsed) {
                                return (
                                    <div 
                                        className="kanban-column-collapsed glass special-inaug-collapsed"
                                        onClick={() => toggleColumn('inauguracao')}
                                        title="Expandir Inaugurações"
                                    >
                                        <div className="collapsed-column-meta">
                                            <span className="collapsed-badge special">{inaugTasks.length}</span>
                                        </div>
                                        <h2 className="vertical-title special">Inaugurações</h2>
                                    </div>
                                );
                            }

                            return (
                                <div className="kanban-column-v3 glass inauguracao-column-v3">
                                    <div className="column-header-v3" data-status="inauguracao">
                                        <div className="header-title-wrapper">
                                            <h2 style={{ color: 'hsl(330, 80%, 35%)' }}>🏛️ Inaugurações</h2>
                                            <span className="task-count-badge special-pink">{inaugTasks.length}</span>
                                        </div>
                                        <button 
                                            className="column-collapse-trigger"
                                            onClick={() => toggleColumn('inauguracao')}
                                            title="Recolher coluna"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="column-content-v3">
                                        {inaugTasks.length === 0 ? (
                                            <div className="empty-column-v3 special-pink">
                                                Aba preenchida gerará espelhos aqui
                                            </div>
                                        ) : (
                                            inaugTasks.map(renderInaugCard)
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* VISÃO TABELA DE PRODUTIVIDADE */}
                {!loading && activeTab === 'table' && (
                    <div className="table-productivity-v3">
                        {/* Dynamic Grouping Selector Toolbar */}
                        <div className="table-view-toolbar-v3 glass">
                            <div className="toolbar-label-v3">
                                <span>Agrupar tabela por:</span>
                            </div>
                            <div className="toolbar-options-v3">
                                <button
                                    className={`group-chip-v3 ${tableGroupBy === 'secretaria' ? 'active' : ''}`}
                                    onClick={() => {
                                        setTableGroupBy('secretaria');
                                        localStorage.setItem('v3_table_group_by', 'secretaria');
                                    }}
                                >
                                    🏛️ Secretaria
                                </button>
                                <button
                                    className={`group-chip-v3 ${tableGroupBy === 'data' ? 'active' : ''}`}
                                    onClick={() => {
                                        setTableGroupBy('data');
                                        localStorage.setItem('v3_table_group_by', 'data');
                                    }}
                                >
                                    📅 Prazo Limite
                                </button>
                            </div>
                        </div>

                        {groupNames.map(groupName => {
                            const groupTasks = tasksByGroup[groupName] || [];
                            const isCollapsed = collapsedGroups[groupName];
                            
                            // Se o grupo está vazio e não é "Demais Demandas", não renderizar para poupar espaço
                            if (groupTasks.length === 0 && groupName !== 'Demais Demandas') return null;

                            return (
                                <div key={groupName} className="table-group-section glass">
                                    {/* Cabeçalho do Grupo */}
                                    <div 
                                        className="table-group-header"
                                        onClick={() => toggleGroup(groupName)}
                                    >
                                        <div className="group-title-left">
                                            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                                            <span className="group-color-pill" style={{
                                                backgroundColor: tableGroupBy === 'data' 
                                                    ? (groupName === 'Sem Prazo' ? '#64748b' : 'hsl(var(--color-primary))')
                                                    : (groupName === 'Demais Demandas' ? '#64748b' : 'hsl(var(--color-primary))')
                                            }} />
                                            <h3>
                                                {tableGroupBy === 'data'
                                                    ? formatGroupDateHeader(groupName)
                                                    : (groupName === 'Demais Demandas' ? '📂 Demais Demandas (Sem Secretaria)' : `🏛️ ${groupName}`)}
                                            </h3>
                                            <span className="group-count">{groupTasks.length} pautas</span>
                                        </div>
                                    </div>

                                    {/* Corpo da Tabela do Grupo */}
                                    {!isCollapsed && (
                                        <div className="table-group-body">
                                            <table className="productivity-table">
                                                <thead>
                                                    <tr>
                                                        <th style={{ width: '40%' }}>Título da Pauta</th>
                                                        <th style={{ width: '18%' }}>Status da Produção</th>
                                                        <th style={{ width: '15%' }}>Canais / Demandas</th>
                                                        <th style={{ width: '10%' }}>Prioridade</th>
                                                        <th style={{ width: '10%' }}>Responsáveis</th>
                                                        <th style={{ width: '12%' }}>Prazo Limite</th>
                                                        <th style={{ width: '5%', textAlign: 'center' }}>Ações</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Inserção Rápida de Pautas (Quick Add Row) */}
                                                    {user?.role !== 'viewer' && (
                                                        <tr className="quick-add-row-tr">
                                                            <td colSpan={7}>
                                                                <form 
                                                                    onSubmit={e => handleQuickAddSubmit(groupName, e)}
                                                                    className="quick-add-form"
                                                                >
                                                                    <Plus size={16} className="quick-add-plus" />
                                                                    <input 
                                                                        type="text"
                                                                        placeholder={
                                                                            tableGroupBy === 'data'
                                                                                ? (groupName === 'Sem Prazo'
                                                                                    ? '+ Adicionar pauta rápida sem prazo... (Pressione Enter)'
                                                                                    : `+ Adicionar pauta rápida para ${formatGroupDateHeader(groupName).replace('📅 ', '')}... (Pressione Enter)`)
                                                                                : `+ Adicionar pauta rápida em "${groupName}"... (Pressione Enter)`
                                                                        }
                                                                        value={quickTitle[groupName] || ''}
                                                                        onChange={e => setQuickTitle(prev => ({
                                                                            ...prev,
                                                                            [groupName]: e.target.value
                                                                        }))}
                                                                        className="quick-add-input"
                                                                    />
                                                                </form>
                                                            </td>
                                                        </tr>
                                                    )}

                                                    {/* Linhas de Dados */}
                                                    {groupTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="no-tasks-tr">
                                                                Nenhuma pauta ativa neste grupo. Use o campo acima para adicionar.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        groupTasks.map(task => {
                                                            const hasComments = task.comments.length > 0;
                                                            const hasAttachments = task.attachments.length > 0;

                                                            return (
                                                                <tr key={task.id} className={`task-tr-v3 priority-line-${task.priority}`}>
                                                                    {/* Título com modal click */}
                                                                    <td onClick={() => setSelectedTask(task)} className="td-clickable td-title-v3">
                                                                        <div className="title-text-wrapper">
                                                                            <span className="task-title-text">{task.title}</span>
                                                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                                                                {task.createdAt && (
                                                                                    <span className="badge-creation-date" title="Data de Criação">
                                                                                        Criada em {format(new Date(task.createdAt), "dd/MM", { locale: ptBR })}
                                                                                    </span>
                                                                                )}
                                                                                {getLeadTimeLabel(task) && (
                                                                                    <span className={`badge-lead-time ${getLeadTimeLabel(task)?.isResolved ? 'resolved' : 'in-progress'}`}>
                                                                                        {getLeadTimeLabel(task)?.isResolved ? '✅' : '⏳'} {getLeadTimeLabel(task)?.label}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="table-meta-icons">
                                                                                {hasComments && (
                                                                                    <span className="table-meta-badge" title="Comentários">
                                                                                        <MessageSquare size={11} />
                                                                                        {task.comments.length}
                                                                                    </span>
                                                                                )}
                                                                                {hasAttachments && (
                                                                                    <span className="table-meta-badge" title="Anexos">
                                                                                        <Paperclip size={11} />
                                                                                        {task.attachments.length}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>

                                                                    {/* Status Dinâmico In-Place Dropdown */}
                                                                    <td>
                                                                        <select
                                                                            value={task.status}
                                                                            onChange={async (e) => {
                                                                                await updateTaskStatus(task.id, e.target.value as TaskStatus);
                                                                            }}
                                                                            disabled={user?.role === 'viewer'}
                                                                            className={`v3-table-status-select status-${task.status}`}
                                                                        >
                                                                            {FLOW_COLUMNS.map(col => (
                                                                                <option key={col.id} value={col.id}>{col.title}</option>
                                                                            ))}
                                                                            <option value="inauguracao">🏛️ Inauguração</option>
                                                                        </select>
                                                                    </td>

                                                                    {/* Tipos Badges */}
                                                                    <td>
                                                                        {getTypeBadge(task.type, task)}
                                                                    </td>

                                                                    {/* Prioridade */}
                                                                    <td>
                                                                        <span className={`priority-tag-table priority-${task.priority}`}>
                                                                            {task.priority === 'alta' ? '🔴 Alta' : task.priority === 'media' ? '🟡 Média' : '🟢 Baixa'}
                                                                        </span>
                                                                    </td>

                                                                    {/* Responsáveis */}
                                                                    <td>
                                                                        <div className="avatar-wrapper-table">
                                                                            <TaskTeamAvatars task={task} team={team} />
                                                                        </div>
                                                                    </td>

                                                                    {/* Prazo */}
                                                                    <td>
                                                                        <div className="table-date-cell">
                                                                            {formatDueDate(task) || <span className="date-none">Sem prazo</span>}
                                                                        </div>
                                                                    </td>

                                                                    {/* Ações Rápidas */}
                                                                    <td style={{ textAlign: 'center' }}>
                                                                        {user?.role !== 'viewer' && (
                                                                            <div className="table-action-btns">
                                                                                <button 
                                                                                    className="btn-table-action" 
                                                                                    onClick={() => archiveTask(task.id)}
                                                                                    title="Arquivar pauta"
                                                                                >
                                                                                    <Archive size={14} />
                                                                                </button>
                                                                                <button 
                                                                                    className="btn-table-action delete" 
                                                                                    onClick={() => {
                                                                                        if(confirm("Deseja realmente deletar permanentemente esta pauta?")) {
                                                                                            deleteTask(task.id);
                                                                                        }
                                                                                    }}
                                                                                    title="Excluir pauta"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─── GAVETA LATERAL PREMIUM (Slide-out History Drawer) ───────────────── */}
            {isDrawerOpen && (
                <>
                    <div className="drawer-overlay" onClick={() => setIsDrawerOpen(false)} />
                    <div className="history-drawer-v3 glass">
                        <div className="drawer-header">
                            <div className="drawer-title-box">
                                <Archive size={20} className="drawer-icon" />
                                <h2>Histórico de Pautas</h2>
                            </div>
                            <button className="drawer-close-btn" onClick={() => setIsDrawerOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="drawer-body">
                            <p className="drawer-hint">Todas as demandas finalizadas e arquivadas da Aura SECOM ficam aqui guardadas para consultas futures.</p>
                            
                            {archivedTasks.length === 0 ? (
                                <div className="drawer-empty-state">
                                    <Archive size={48} className="empty-icon" />
                                    <p>Nenhuma pauta arquivada no histórico.</p>
                                </div>
                            ) : (
                                <div className="drawer-cards-list">
                                    {archivedTasks.map(task => (
                                        <div 
                                            key={task.id}
                                            className="drawer-archived-card"
                                            onClick={() => {
                                                setSelectedTask(task);
                                                setIsDrawerOpen(false);
                                            }}
                                        >
                                            <div className="drawer-card-header">
                                                <h4>{task.title}</h4>
                                                <span className={`priority-tag-table priority-${task.priority}`}>
                                                    {task.priority.toUpperCase()}
                                                </span>
                                            </div>
                                            <p className="drawer-card-date">
                                                Arquivado em: {task.archived_at ? new Date(task.archived_at).toLocaleDateString('pt-BR') : '—'}
                                            </p>
                                            <div className="drawer-card-actions" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => unarchiveTask(task.id)}
                                                    className="btn-unarchive-v3"
                                                >
                                                    <RotateCcw size={12} /> Desarquivar
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modais Globais */}
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
