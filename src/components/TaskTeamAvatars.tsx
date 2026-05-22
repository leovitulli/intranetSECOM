/**
 * TaskTeamAvatars.tsx
 * Exibe avatares sobrepostos da equipe de uma task.
 * Extraído do Agenda.tsx para limpar o JSX inline.
 *
 * Uso:
 *   import TaskTeamAvatars from './TaskTeamAvatars';
 *   <TaskTeamAvatars task={task} team={team} />
 */

import type { Task } from '../types/kanban';
import type { TeamMember } from '../types/team';

interface Props {
    task: Task;
    team: TeamMember[];
}

export default function TaskTeamAvatars({ task, team }: Props) {
    const creators  = task.creator ? task.creator.split(',').map(s => s.trim()).filter(Boolean) : [];
    const assignees = task.assignees || [];
    const allPeople = Array.from(new Set([...creators, ...assignees]));

    if (allPeople.length === 0) return null;

    const MAX_AVATARS = 4;
    const showPlusBadge = allPeople.length > MAX_AVATARS;
    const visiblePeople = showPlusBadge ? allPeople.slice(0, MAX_AVATARS - 1) : allPeople;
    const remainingCount = allPeople.length - visiblePeople.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            {visiblePeople.map((person, index) => {
                const member = team.find(m => m.name === person);
                const ml = index > 0 ? -8 : 0;
                const sharedStyle: React.CSSProperties = {
                    width: 28, height: 28, borderRadius: '50%',
                    border: '2px solid hsl(var(--color-surface))',
                    marginLeft: ml, flexShrink: 0,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                    position: 'relative',
                    zIndex: 10 - index // Garantir que o primeiro fique por cima do segundo, etc. (se preferir)
                };

                return member?.avatar_url ? (
                    <img
                        key={person}
                        src={member.avatar_url}
                        alt={person}
                        title={person}
                        style={{ ...sharedStyle, objectFit: 'cover' }}
                    />
                ) : (
                    <div
                        key={person}
                        title={person}
                        style={{
                            ...sharedStyle,
                            background: 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-accent)))',
                            color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        {person.charAt(0).toUpperCase()}
                    </div>
                );
            })}
            
            {showPlusBadge && (
                <div
                    title={`${remainingCount} mais`}
                    style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '2px solid hsl(var(--color-surface))',
                        marginLeft: -8, flexShrink: 0,
                        background: 'hsl(var(--color-surface-hover, #f1f5f9))',
                        color: 'hsl(var(--color-text-muted))', 
                        fontSize: '0.7rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                        position: 'relative',
                        zIndex: 0
                    }}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
}
