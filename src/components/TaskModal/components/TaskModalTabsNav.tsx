import React from 'react';
import type { Task, TaskType } from '../../../types/kanban';

interface TaskModalTabsNavProps {
    activeTab: string;
    onTabChange: (tab: any) => void;
    task: Task;
}

export const TaskModalTabsNav: React.FC<TaskModalTabsNavProps> = ({
    activeTab,
    onTabChange,
    task
}) => {
    const tabs: [string, string][] = [
        ['geral', 'Geral'],
        ['release', '📝 Release'],
        ['post', '📱 Post'],
        ['video', '🎬 Vídeo'],
        ['foto', '📸 Foto'],
        ['arte', '🎨 Arte'],
        ['inauguracao', '🏛️ Inauguração'],
    ];

    return (
        <div className="tabs-bar-premium">
            {tabs.map(([tab, label]) => (
                <button
                    key={tab}
                    type="button"
                    data-tab={tab}
                    className={`tab-btn-premium ${activeTab === tab ? 'active' : ''} ${tab !== 'geral' && task.type.includes(tab as TaskType) ? 'has-type' : ''}`}
                    onClick={() => onTabChange(tab as any)}
                >
                    {label}
                </button>
            ))}
        </div>
    );
};
