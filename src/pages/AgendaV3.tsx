import { useState, useEffect } from 'react';
import { 
    MapPin, Clock, ExternalLink, Building2, Copy, Check, X, 
    ChevronLeft, ChevronRight, Calendar, Search, Plus, User, Sparkles
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import TaskModal from '../components/TaskModal';
import TaskTeamAvatars from '../components/TaskTeamAvatars';
import type { Task } from '../types/kanban';
import './AgendaV3.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStartHour(horario: string): number {
    if (!horario) return 0;
    const match = horario.match(/(\d{1,2}):(\d{2})/);
    return match ? parseInt(match[1]) : 0;
}

function getPeriodo(horario: string): 'manha' | 'tarde' | 'noite' {
    const h = getStartHour(horario);
    if (h < 12) return 'manha';
    if (h < 18) return 'tarde';
    return 'noite';
}

const PERIODO_LABEL: Record<string, string> = {
    manha: '🌅 PERÍODO DA MANHÃ',
    tarde: '🌤️ PERÍODO DA TARDE',
    noite: '🌙 PERÍODO DA NOITE',
};

function formatHorario(horario: string): string {
    return horario.replace(/(\d{2}):(\d{2})/g, '$1h$2');
}

// ── Modal de copiar (Revamp Glassmorphic) ───────────────────────────────────────
interface CopyModalProps {
    day: Date;
    tasks: Task[];
    team: { id: string; name: string; role: string; job_titles?: string[]; avatar_url?: string }[];
    onClose: () => void;
}

function CopyModal({ day, tasks, team, onClose }: CopyModalProps) {
    const [observacoes, setObservacoes] = useState<Record<string, string>>({});
    const [copied, setCopied] = useState(false);

    const getMemberLabel = (name: string): string => {
        const member = team.find(m => m.name === name);
        if (!member) return name;
        const titles = member.job_titles || [];
        return titles.length > 0 ? `${name} (${titles[0]})` : name;
    };

    const getMotorista = (task: Task): string | null => {
        const all = [...(task.assignees || [])];
        return all.find(name => team.find(t => t.name === name)?.role === 'motorista') || null;
    };

    const getEquipe = (task: Task): string[] => {
        const all = [...(task.assignees || [])];
        return all.filter(name => team.find(t => t.name === name)?.role !== 'motorista');
    };

    const buildText = (): string => {
        const dayName = format(day, 'EEEE', { locale: ptBR }).toUpperCase();
        const dayDate = format(day, 'dd/MM/yyyy');
        let text = `Olá, equipe! 👋 Seguem as pautas previstas\n\n*${dayName} – ${dayDate}*\n`;

        (['manha', 'tarde', 'noite'] as const).forEach(periodo => {
            const pt = tasks.filter(t => getPeriodo(t.pauta_horario || '') === periodo);
            if (!pt.length) return;

            text += `\n${PERIODO_LABEL[periodo]}\n`;

            pt.forEach(task => {
                const startTime = formatHorario(task.pauta_horario || 'Horário a definir');
                const endTime = task.pauta_horario_end ? formatHorario(task.pauta_horario_end) : null;
                const departureTime = task.pauta_saida ? formatHorario(task.pauta_saida) : null;
                const horarioCobertura = endTime ? `${startTime} às ${endTime}` : startTime;
                const lineDeparture = departureTime ? `*${departureTime}* (Saída do Paço)` : '';
                const lineCoverage = `*${horarioCobertura}* (Cobertura)`;
                
                const linhaHorario = departureTime 
                    ? `⏱ ${lineDeparture} | ${lineCoverage}`
                    : `⏱ ${lineCoverage}`;

                const equipe = getEquipe(task).map(getMemberLabel).join(' | ');
                const motorista = getMotorista(task);
                const obs = observacoes[task.id]?.trim();
                const mapsLink = task.pauta_endereco
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.pauta_endereco)}`
                    : null;

                text += `\n${linhaHorario}\n*${task.title}*\n`;

                if (task.pauta_endereco) {
                    text += `📍 *Local:* ${task.pauta_endereco}`;
                    if (mapsLink) text += ` (${mapsLink})`;
                    text += `\n`;
                }

                if (equipe.length) text += `*Equipe:* ${equipe}\n`;

                const motoristaLabel = motorista ? getMemberLabel(motorista) : 'Motorista não selecionado';
                const motoristaSaida = task.pauta_saida ? ` (Previsão de saída: ${formatHorario(task.pauta_saida)})` : '';
                text += `\n*Motorista:* ${motoristaLabel}${motoristaSaida}\n`;

                if (obs) text += `📌 *Observações:* ${obs}\n`;
            });
        });

        return text.trim();
    };

    const handleCopy = async () => {
        const text = buildText();
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const el = document.createElement('textarea');
            el.value = text;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => {
            setCopied(false);
            onClose();
        }, 1200);
    };

    return (
        <div className="copy-modal-overlay" onClick={onClose}>
            <div className="copy-modal-card glass" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="copy-modal-header">
                    <div>
                        <div className="copy-modal-title">
                            <Sparkles size={16} className="pulse-sparkle text-primary" />
                            <span>Copiar Agenda do Dia</span>
                        </div>
                        <div className="copy-modal-subtitle">
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </div>
                    </div>
                    <button className="copy-modal-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="copy-modal-content">
                    <p className="copy-modal-hint">
                        Adicione observações personalizadas para cada pauta externa antes de copiar para o WhatsApp.
                    </p>

                    <div className="copy-modal-list">
                        {tasks.map((task, idx) => (
                            <div key={task.id} className="copy-task-item">
                                <div className="copy-task-meta">
                                    <span className="copy-task-badge">
                                        {formatHorario(task.pauta_horario || '00:00')}
                                    </span>
                                    <span className="copy-task-title">{task.title}</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder={`Observação para a pauta ${idx + 1}...`}
                                    value={observacoes[task.id] || ''}
                                    onChange={e => setObservacoes(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    className="copy-task-input"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="copy-modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        className={`btn-primary copy-action-btn ${copied ? 'copied' : ''}`}
                        onClick={handleCopy}
                    >
                        {copied ? (
                            <>
                                <Check size={16} /> Copiado!
                            </>
                        ) : (
                            <>
                                <Copy size={16} /> Copiar para WhatsApp
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Componente Principal ────────────────────────────────────────────────────────
export default function AgendaV3() {
    const { user } = useAuth();
    const { tasks, team, loading, updateTask, addTask, secretarias } = useData();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [copyDay, setCopyDay] = useState<Date | null>(null);

    // Filtros Locais
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAssignee, setSelectedAssignee] = useState('');
    const [selectedSec, setSelectedSec] = useState('');

    // Criação Rápida Inline
    const [activeQuickAddDay, setActiveQuickAddDay] = useState<string | null>(null);
    const [quickAddTitle, setQuickAddTitle] = useState('');
    const [quickAddHour, setQuickAddHour] = useState('09:00');
    const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i));

    const isCurrentWeek = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 });
    const weekStartFormat = format(days[0], 'dd/MMM', { locale: ptBR });
    const weekEndFormat = format(days[6], 'dd/MMM', { locale: ptBR });
    const legendText = isCurrentWeek ? 'Semana Atual' : `${weekStartFormat} a ${weekEndFormat}`.toUpperCase();

    // Filtro e Busca combinados para Pautas
    const filterAndSearchTasks = (dayTasks: Task[]) => {
        return dayTasks.filter(task => {
            // Busca textual (título, descrição, local)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesText = 
                    task.title.toLowerCase().includes(query) ||
                    (task.description && task.description.toLowerCase().includes(query)) ||
                    (task.pauta_endereco && task.pauta_endereco.toLowerCase().includes(query));
                
                if (!matchesText) return false;
            }

            // Filtro por Membro
            if (selectedAssignee) {
                const hasAssignee = task.assignees?.includes(selectedAssignee);
                if (!hasAssignee) return false;
            }

            // Filtro por Secretaria
            if (selectedSec) {
                const hasSec = task.secretarias?.includes(selectedSec) || task.inauguracao_secretarias?.includes(selectedSec);
                if (!hasSec) return false;
            }

            return true;
        });
    };

    const handleQuickAddSubmit = async (dayString: string, e: React.FormEvent) => {
        e.preventDefault();
        const title = quickAddTitle.trim();
        if (!title) return;

        setIsSavingQuickAdd(true);
        const newPauta: Omit<Task, 'id'> = {
            title,
            description: '',
            status: 'solicitado',
            creator: user?.name || 'Desconhecido',
            priority: 'media',
            type: ['release'],
            assignees: [],
            secretarias: selectedSec ? [selectedSec] : [],
            comments: [],
            attachments: [],
            createdAt: new Date(),
            dueDate: null,
            pauta_data: dayString,
            is_pauta_externa: true,
            pauta_horario: quickAddHour || '09:00'
        };

        try {
            const result = await addTask(newPauta);
            if (result.success) {
                setQuickAddTitle('');
                setActiveQuickAddDay(null);
            }
        } catch (err) {
            console.error('Erro na criação inline:', err);
        } finally {
            setIsSavingQuickAdd(false);
        }
    };

    // Fechar formulário rápido ao apertar Esc
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setActiveQuickAddDay(null);
                setQuickAddTitle('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="page-container agenda-v3-page">
            
            {/* Header Area */}
            <div className="agenda-v3-header-panel glass">
                <div className="agenda-v3-title-box">
                    <div className="glow-icon-box">
                        <Calendar size={24} className="text-primary pulse-sparkle" />
                    </div>
                    <div>
                        <h1>Agenda da Equipe Externa <span className="beta-tag">v3.0 Beta</span></h1>
                        <p className="subtitle">Planejamento visual de coberturas, eventos externos e deslocamentos.</p>
                    </div>
                </div>

                {/* Week Navigation Controls */}
                <div className="week-nav-panel">
                    <button 
                        className="week-nav-arrow" 
                        onClick={() => setCurrentDate(prev => addDays(prev, -7))}
                        title="Semana Anterior"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    
                    <button 
                        className={`week-nav-today-btn ${isCurrentWeek ? 'active' : ''}`}
                        onClick={() => setCurrentDate(new Date())}
                    >
                        <Clock size={14} />
                        <span>{legendText}</span>
                    </button>

                    <button 
                        className="week-nav-arrow" 
                        onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                        title="Próxima Semana"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Premium Filter Dashboard Panel */}
            <div className="agenda-v3-filter-dashboard glass">
                <div className="filter-search-input-wrapper">
                    <Search size={16} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder="Buscar pautas, locais ou motoristas..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-filter-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="filter-dropdowns-group">
                    <div className="filter-select-wrapper">
                        <User size={14} className="select-icon" />
                        <select 
                            value={selectedAssignee}
                            onChange={e => setSelectedAssignee(e.target.value)}
                        >
                            <option value="">Filtrar por Equipe...</option>
                            {team.map(member => (
                                <option key={member.id} value={member.name}>{member.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-select-wrapper">
                        <Building2 size={14} className="select-icon" />
                        <select 
                            value={selectedSec}
                            onChange={e => setSelectedSec(e.target.value)}
                        >
                            <option value="">Filtrar por Secretaria...</option>
                            {secretarias.map(sec => (
                                <option key={sec.id} value={sec.nome}>{sec.nome}</option>
                            ))}
                        </select>
                    </div>

                    {(searchQuery || selectedAssignee || selectedSec) && (
                        <button 
                            className="btn-secondary clear-all-filters-btn"
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedAssignee('');
                                setSelectedSec('');
                            }}
                        >
                            Limpar Filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Grid of Days */}
            <div className="agenda-v3-grid">
                {days.map(day => {
                    const dayString = format(day, 'yyyy-MM-dd');
                    const rawDayTasks = tasks
                        .filter(t => t.pauta_data === dayString && t.is_pauta_externa && !t.archived)
                        .sort((a, b) => (a.pauta_horario || '').localeCompare(b.pauta_horario || ''));
                    
                    const dayTasks = filterAndSearchTasks(rawDayTasks);
                    const isToday = format(new Date(), 'yyyy-MM-dd') === dayString;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                        <div 
                            key={day.toISOString()} 
                            className={`agenda-v3-day glass ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}`}
                        >
                            {/* Column Header */}
                            <div className="v3-day-header">
                                <div className="v3-day-title-meta">
                                    <h3>{format(day, 'EEEE', { locale: ptBR })}</h3>
                                    <span className="v3-day-date">
                                        {format(day, "dd 'de' MMM", { locale: ptBR })}
                                    </span>
                                </div>

                                {rawDayTasks.length > 0 && (
                                    <button 
                                        className="v3-day-copy-btn" 
                                        onClick={() => setCopyDay(day)}
                                        title="Copiar agenda do dia para o WhatsApp"
                                    >
                                        <Copy size={13} />
                                        <span>Copiar</span>
                                    </button>
                                )}
                            </div>

                            {/* Cards Area */}
                            <div className="v3-day-events">
                                {loading && <p className="v3-empty-state">Carregando...</p>}
                                {!loading && dayTasks.length === 0 && (
                                    <div className="v3-no-events">
                                        <Calendar size={18} style={{ opacity: 0.3 }} />
                                        <span>Sem pautas externas</span>
                                    </div>
                                )}
                                {!loading && dayTasks.map(task => {
                                    const hasInaug = task.type?.includes('inauguracao' as any);
                                    return (
                                        <div 
                                            key={task.id} 
                                            className={`v3-event-card priority-${task.priority}`} 
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <div className="v3-card-header">
                                                <div className="v3-card-badges">
                                                    <span className="v3-badge-pauta">Externa</span>
                                                    {hasInaug && (
                                                        <span className="v3-badge-inaug">
                                                            <Building2 size={10} /> Inauguração
                                                        </span>
                                                    )}
                                                </div>
                                                <ExternalLink size={12} className="v3-card-link-icon" />
                                            </div>

                                            <h4 className="v3-card-title">{task.title}</h4>

                                            {task.description && (
                                                <p className="v3-card-desc">{task.description}</p>
                                            )}

                                            <div className="v3-card-details">
                                                {task.pauta_endereco && (
                                                    <div className="v3-detail-item" title={task.pauta_endereco}>
                                                        <MapPin size={12} className="text-warning" />
                                                        <span>{task.pauta_endereco}</span>
                                                    </div>
                                                )}
                                                {task.pauta_saida && (
                                                    <div className="v3-detail-item" title="Horário de saída do Paço">
                                                        <span>🚗</span>
                                                        <span>Saída: {task.pauta_saida}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="v3-card-footer">
                                                <div className="v3-card-time">
                                                    <Clock size={12} className="text-primary" />
                                                    <span>{task.pauta_horario || 'A definir'}</span>
                                                </div>
                                                <div className="v3-card-team">
                                                    <TaskTeamAvatars task={task} team={team} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Column Footer: Inline Quick Add Event */}
                            <div className="v3-day-footer">
                                {activeQuickAddDay === dayString ? (
                                    <form 
                                        className="v3-inline-quick-add-form"
                                        onSubmit={e => handleQuickAddSubmit(dayString, e)}
                                    >
                                        <input 
                                            type="text" 
                                            placeholder="Título do evento..." 
                                            value={quickAddTitle}
                                            onChange={e => setQuickAddTitle(e.target.value)}
                                            autoFocus
                                            required
                                            disabled={isSavingQuickAdd}
                                            className="v3-quick-add-input"
                                        />
                                        <div className="v3-inline-quick-add-row">
                                            <input 
                                                type="time" 
                                                value={quickAddHour}
                                                onChange={e => setQuickAddHour(e.target.value)}
                                                disabled={isSavingQuickAdd}
                                                className="v3-quick-add-time"
                                            />
                                            <div className="v3-quick-add-actions">
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        setActiveQuickAddDay(null);
                                                        setQuickAddTitle('');
                                                    }}
                                                    className="v3-quick-add-btn cancel"
                                                >
                                                    <X size={14} />
                                                </button>
                                                <button 
                                                    type="submit" 
                                                    disabled={isSavingQuickAdd}
                                                    className="v3-quick-add-btn save"
                                                >
                                                    {isSavingQuickAdd ? '...' : <Check size={14} />}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                ) : (
                                    <button 
                                        className="v3-inline-add-trigger"
                                        onClick={() => {
                                            setActiveQuickAddDay(dayString);
                                            setQuickAddTitle('');
                                        }}
                                    >
                                        <Plus size={14} />
                                        <span>Adicionar Evento</span>
                                    </button>
                                )}
                            </div>

                        </div>
                    );
                })}
            </div>

            {/* Modais */}
            {copyDay && (
                <CopyModal
                    day={copyDay}
                    tasks={tasks
                        .filter(t => t.pauta_data === format(copyDay, 'yyyy-MM-dd') && t.is_pauta_externa && !t.archived)
                        .sort((a, b) => (a.pauta_horario || '').localeCompare(b.pauta_horario || ''))
                    }
                    team={team}
                    onClose={() => setCopyDay(null)}
                />
            )}

            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    onUpdateTask={updateTask}
                />
            )}

        </div>
    );
}
