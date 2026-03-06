import { useState } from 'react';
import type { Task, TaskType, TaskPriority } from '../types/kanban';
import { X } from 'lucide-react';
import './CreateTaskModal.css';
import SecretariasMultiSelect from './SecretariasMultiSelect';

interface CreateTaskModalProps {
    onClose: () => void;
    onCreate: (task: Task) => void;
}

import { useAuth } from '../contexts/AuthContext';
import { INITIAL_TEAM } from '../utils/mockTeam';
export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [types, setTypes] = useState<TaskType[]>(['release']);
    const [priority, setPriority] = useState<TaskPriority>('media');
    const [assignees, setAssignees] = useState<string[]>([]);
    const [secretarias, setSecretarias] = useState<string[]>([]);

    const handleTypeToggle = (typeStr: TaskType) => {
        setTypes(prev =>
            prev.includes(typeStr)
                ? prev.filter(t => t !== typeStr)
                : [...prev, typeStr]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) return;

        // Auto-add the current user as a responsible if not already selected
        const finalAssignees = user && !assignees.includes(user.name)
            ? [user.name, ...assignees]
            : assignees;

        const newTask: Task = {
            id: Date.now().toString(),
            title,
            description,
            status: 'solicitado', // Always starts at solicited
            type: types,
            creator: secretarias.length > 0 ? secretarias.join(', ') : (user ? user.name : 'Unknown User'),
            priority,
            assignees: finalAssignees,
            dueDate: new Date(Date.now() + 86400000 * 5), // Default 5 days from now
            comments: [],
            attachments: []
        };

        onCreate(newTask);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-task-modal" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header">
                    <h2 className="modal-title">Nova Pauta / Solicitação</h2>
                    <p className="subtitle" style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                        Preencha os detalhes para iniciar uma nova demanda de comunicação.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="create-task-form">
                    <div className="form-group">
                        <label htmlFor="title">Título da Pauta *</label>
                        <input
                            id="title"
                            type="text"
                            placeholder="Ex: Arte para Campanha de Doação de Sangue"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group flex-1">
                            <label>Tipos de Material (Múltiplos) *</label>
                            <div className="types-checkbox-group">
                                <label className="type-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={types.includes('release')}
                                        onChange={() => handleTypeToggle('release')}
                                    /> 📝 Texto / Release
                                </label>
                                <label className="type-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={types.includes('arte')}
                                        onChange={() => handleTypeToggle('arte')}
                                    /> 🎨 Arte Gráfica
                                </label>
                                <label className="type-checkbox">
                                    <input
                                        type="checkbox"
                                        checked={types.includes('video')}
                                        onChange={() => handleTypeToggle('video')}
                                    /> 🎬 Vídeo / Audiovisual
                                </label>
                            </div>
                        </div>

                        <div className="form-group flex-1">
                            <label htmlFor="priority">Prioridade *</label>
                            <select id="priority" value={priority} onChange={e => setPriority(e.target.value as TaskPriority)}>
                                <option value="baixa">Baixa (Rotina)</option>
                                <option value="media">Média (Importante)</option>
                                <option value="alta">Alta (Urgente!)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Responsáveis / Colaboradores Iniciais</label>
                        <div className="team-grid">
                            {INITIAL_TEAM.map(member => (
                                <label key={member.id} className="type-checkbox" style={{ fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={assignees.includes(member.name)}
                                        onChange={() => {
                                            setAssignees(prev =>
                                                prev.includes(member.name)
                                                    ? prev.filter(name => name !== member.name)
                                                    : [...prev, member.name]
                                            );
                                        }}
                                    />
                                    <strong>{member.name}</strong> <span style={{ color: 'var(--color-text-muted)' }}>({member.role})</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Secretaria Solicitante</label>
                        <SecretariasMultiSelect
                            selected={secretarias}
                            onChange={setSecretarias}
                            placeholder="Buscar secretaria..."
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="desc">Briefing / Detalhes da Solicitação *</label>
                        <textarea
                            id="desc"
                            rows={5}
                            placeholder="Descreva o que precisa ser feito, público alvo, formatos, etc."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={!title || !description}>
                            Criar Solicitação
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
