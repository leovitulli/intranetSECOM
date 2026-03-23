import { useState } from 'react';
import { MapPin, Clock, ExternalLink, Building2, Copy, Check, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek, isSameWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useData } from '../contexts/DataContext';
import TaskModal from '../components/TaskModal';
import TaskTeamAvatars from '../components/TaskTeamAvatars';
import type { Task } from '../types/kanban';
import './Agenda.css';

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

// ── Modal de copiar ───────────────────────────────────────────────────────────
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
        const all = [
            ...(task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : []),
            ...(task.assignees || []),
        ];
        return all.find(name => team.find(t => t.name === name)?.role === 'motorista') || null;
    };

    const getEquipe = (task: Task): string[] => {
        const all = [
            ...(task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : []),
            ...(task.assignees || []),
        ];
        return all.filter(name => team.find(t => t.name === name)?.role !== 'motorista');
    };

    const buildText = (): string => {
        const dayName = format(day, 'EEEE', { locale: ptBR }).toUpperCase();
        const dayDate = format(day, 'dd/MM/yyyy');
        let text = `Olá, equipe! 👋 Seguem as pautas de hoje.\n\n📅 ${dayName} – ${dayDate}\n`;

        (['manha', 'tarde', 'noite'] as const).forEach(periodo => {
            const pt = tasks.filter(t => getPeriodo(t.pauta_horario || '') === periodo);
            if (!pt.length) return;

            text += `\n${PERIODO_LABEL[periodo]}\n`;

            pt.forEach(task => {
                const horario = formatHorario(task.pauta_horario || 'Horário a definir');
                const equipe = getEquipe(task).map(getMemberLabel);
                const motorista = getMotorista(task);
                const obs = observacoes[task.id]?.trim();
                const mapsLink = task.pauta_endereco
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(task.pauta_endereco)}`
                    : null;

                text += `\n⏱ ${horario}\n${task.title}\n`;
                if (task.pauta_endereco) {
                    text += `Local: ${task.pauta_endereco}\n`;
                    if (mapsLink) text += `📍 Maps: ${mapsLink}\n`;
                }
                if (equipe.length) text += `Equipe: ${equipe.join(' | ')}\n`;
                if (motorista) {
                    const saida = task.pauta_saida ? ` (Previsão de saída: ${formatHorario(task.pauta_saida)})` : '';
                    text += `Motorista: ${getMemberLabel(motorista)}${saida}\n`;
                }
                if (obs) text += `📌 Observações: ${obs}\n`;
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
        setTimeout(() => { setCopied(false); onClose(); }, 1500);
    };

    return (
        <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 540, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', overflow: 'hidden' }}
            >
                {/* Header */}
                <div style={{ padding: '1.5rem 1.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>📋 Copiar Agenda do Dia</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, textTransform: 'capitalize' }}>
                            {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* Lista com observações */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                        Adicione observações opcionais para cada pauta antes de copiar.
                    </p>

                    {tasks.map((task, idx) => (
                        <div key={task.id} style={{ background: '#f8fafc', borderRadius: 12, padding: '1rem', border: '1.5px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    {formatHorario(task.pauta_horario || '--')}
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                                    {task.title}
                                </span>
                            </div>
                            <input
                                type="text"
                                placeholder={`Observação pauta ${idx + 1} (opcional)...`}
                                value={observacoes[task.id] || ''}
                                onChange={e => setObservacoes(prev => ({ ...prev, [task.id]: e.target.value }))}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: '0.85rem', background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                onFocus={e => (e.currentTarget.style.borderColor = '#3b82f6')}
                                onBlur={e => (e.currentTarget.style.borderColor = '#e2e8f0')}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 10, background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Cancelar
                    </button>
                    <button
                        onClick={handleCopy}
                        style={{ padding: '8px 24px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, background: copied ? '#10b981' : '#1e293b', color: 'white', transition: 'background 0.2s' }}
                    >
                        {copied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Agenda</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Agenda() {
    const { tasks, team, loading, updateTask } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [copyDay, setCopyDay] = useState<Date | null>(null);

    const startOfCurrentWeek = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(startOfCurrentWeek, i));

    // Legendas dinâmicas
    const isCurrentWeek = isSameWeek(new Date(), currentDate, { weekStartsOn: 1 });
    const weekStartFormat = format(days[0], 'dd/MMM', { locale: ptBR });
    const weekEndFormat = format(days[4], 'dd/MMM', { locale: ptBR }); // Até Sexta
    const legendText = isCurrentWeek ? 'SEMANA ATUAL' : `${weekStartFormat} a ${weekEndFormat}`.toUpperCase();

    return (
        <div className="page-container agenda-page">
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div>
                        <h1>Agenda da Equipe Externa</h1>
                        <p className="subtitle">Visão geral de organização das equipes durante a semana.</p>
                    </div>

                    {/* Controles de Navegação */}
                    <div className="week-navigation-premium" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <button 
                            className="btn-icon-premium" 
                            onClick={() => setCurrentDate(prev => addDays(prev, -7))}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                            title="Semana Anterior"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <button 
                            className="btn-today-premium"
                            onClick={() => setCurrentDate(new Date())}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: isCurrentWeek ? 'hsl(var(--color-primary))' : 'hsl(var(--color-bg-secondary))', color: isCurrentWeek ? '#ffffff' : 'hsl(var(--color-text))', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            <Calendar size={16} />
                            {legendText}
                        </button>

                        <button 
                            className="btn-icon-premium" 
                            onClick={() => setCurrentDate(prev => addDays(prev, 7))}
                            style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                            title="Próxima Semana"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="agenda-grid">
                {days.map(day => {
                    const dayString = format(day, 'yyyy-MM-dd');
                    const dayTasks = tasks
                        .filter(t => t.pauta_data === dayString && t.is_pauta_externa && !t.archived)
                        .sort((a, b) => (a.pauta_horario || '').localeCompare(b.pauta_horario || ''));

                    return (
                        <div key={day.toISOString()} className="agenda-day">
                            <div className="day-header" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '1.1rem', margin: 0, textTransform: 'capitalize' }}>
                                    {format(day, 'EEEE', { locale: ptBR })}
                                </h3>

                                {dayTasks.length > 0 && (
                                    <button
                                        onClick={() => setCopyDay(day)}
                                        title="Copiar agenda do dia"
                                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: '#475569', transition: 'all 0.2s' }}
                                        onMouseOver={e => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#1e293b'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                                    >
                                        <Copy size={13} /> Copiar
                                    </button>
                                )}
                            </div>

                            <div className="day-events">
                                {loading && <p className="empty-state">Carregando...</p>}
                                {!loading && dayTasks.length === 0 && <div className="no-events text-muted">Agenda livre</div>}
                                {!loading && dayTasks.map(task => {
                                    const isExternal = task.type?.includes('externa' as any);
                                    return (
                                        <div key={task.id} className={`event-card clickable priority-${task.priority}`} onClick={() => setSelectedTask(task)}>
                                            <div className="card-header" style={{ marginBottom: 8 }}>
                                                <div className="task-badges-container" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {isExternal && <span className="badge-tag badge-inauguracao">Agenda Externa</span>}
                                                    {task.type?.includes('inauguracao' as any) && !isExternal && (
                                                        <span className="badge-tag badge-inauguracao"><Building2 size={12} /> Inauguração</span>
                                                    )}
                                                </div>
                                                <button className="icon-btn-small" style={{ opacity: 0.5, border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                    <ExternalLink size={14} />
                                                </button>
                                            </div>

                                            <h4 className="card-title event-title" style={{ margin: '0 0 8px 0', fontSize: '0.95rem' }}>{task.title}</h4>

                                            {task.description && (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.description}
                                                </div>
                                            )}

                                            <div className="event-details" style={{ marginBottom: 8 }}>
                                                {task.pauta_endereco && (
                                                    <div className="event-location" title="Localização">
                                                        <MapPin size={14} style={{ flexShrink: 0 }} />
                                                        <span style={{ fontSize: '0.75rem' }}>{task.pauta_endereco}</span>
                                                    </div>
                                                )}
                                                {task.pauta_saida && (
                                                    <div className="event-departure" title="Horário de Saída do Paço">
                                                        <span>🚗</span> Saída: {task.pauta_saida}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="card-footer" style={{ borderTop: 'none', paddingTop: 0, marginTop: 12 }}>
                                                <div className="event-time" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: 12, width: 'fit-content' }}>
                                                    <Clock size={12} /> {task.pauta_horario || 'Horário a definir'}
                                                </div>
                                            </div>

                                            <div className="event-team" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                                <TaskTeamAvatars task={task} team={team} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

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
