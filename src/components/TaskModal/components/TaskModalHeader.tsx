import React from 'react';
import { X, FileText } from 'lucide-react';
import type { Task } from '../../../types/kanban';

interface TaskModalHeaderProps {
    task: Task;
    isEditingTitle: boolean;
    setIsEditingTitle: (v: boolean) => void;
    editTitleContent: string;
    setEditTitleContent: (v: string) => void;
    isViewer: boolean;
    onClose: () => void;
    onFieldChange: (field: keyof Task, value: any) => void;
}

export const TaskModalHeader: React.FC<TaskModalHeaderProps> = ({
    task,
    isEditingTitle,
    setIsEditingTitle,
    editTitleContent,
    setEditTitleContent,
    isViewer,
    onClose,
    onFieldChange
}) => {
    return (
        <div className="nova-pauta-header-premium">
            <div className="header-left-premium">
                <div className="header-icon-premium"><FileText size={24} /></div>
                <div className="header-titles-premium">
                    {isEditingTitle ? (
                        <input
                            type="text"
                            className="input-premium title-input-premium"
                            style={{ margin: 0, padding: '4px 8px', height: 'auto', fontSize: '1.5rem', fontWeight: 800 }}
                            value={editTitleContent}
                            onChange={e => setEditTitleContent(e.target.value)}
                            onBlur={() => {
                                setIsEditingTitle(false);
                                if (editTitleContent.trim() && editTitleContent !== task.title) {
                                    onFieldChange('title', editTitleContent.trim());
                                }
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                            autoFocus
                        />
                    ) : (
                        <h2 
                            title={!isViewer ? "Clique para editar o título" : ""} 
                            onClick={() => !isViewer && setIsEditingTitle(true)} 
                            style={{ cursor: !isViewer ? 'pointer' : 'default' }}
                        >
                            {task.title}
                        </h2>
                    )}
                    <span className="header-subtitle-premium">Detalhamento da Pauta</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                <select
                    className="select-premium"
                    style={{ width: 'auto', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: '1.5px solid #e2e8f0', background: 'white' }}
                    value={task.priority}
                    onChange={e => onFieldChange('priority', e.target.value as any)}
                    disabled={isViewer}
                >
                    <option value="baixa">🟢 Baixa</option>
                    <option value="media">🟡 Média</option>
                    <option value="alta">🔴 Alta</option>
                </select>

                <div style={{ fontSize: '0.7rem', fontWeight: 800, padding: '6px 12px', borderRadius: '20px', background: '#f1f5f9', color: '#475569', border: '1.5px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                    {task.status.toUpperCase()}
                </div>

                <button className="close-btn-premium" onClick={onClose} title="Fechar">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
