import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, Pencil, Check, X, Loader2 } from 'lucide-react';
import './Profile.css';

export default function ProfileRolesTab() {
    const { jobFunctions, addJobFunction, updateJobFunction, removeJobFunction } = useData();
    const [newTitle, setNewTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    
    // Edit state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsSaving(true);
        try {
            await addJobFunction(newTitle.trim());
            setNewTitle('');
        } catch (error) {
            console.error(error);
            alert("Erro ao adicionar cargo.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartEdit = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditingTitle(currentTitle);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingTitle('');
    };

    const handleSaveEdit = async (id: string) => {
        if (!editingTitle.trim()) return;
        setIsSaving(true);
        try {
            await updateJobFunction(id, editingTitle.trim());
            setEditingId(null);
        } catch (error) {
            console.error(error);
            alert("Erro ao editar cargo.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        if (confirm("Tem certeza que deseja remover este cargo do sistema?\n\nAtenção: isso não removerá o cargo automaticamente dos perfis que já o possuem, apenas impedirá novas atribuições.")) {
            try {
                await removeJobFunction(id);
            } catch (error: any) {
                console.error(error);
                alert(error.message || "Erro ao remover cargo.");
            }
        }
    };

    return (
        <div className="profile-roles-tab">
            <div className="tab-header">
                <h2>Cargos do Sistema</h2>
                <p>Gerencie os nomes das funções que podem ser atribuídas à equipe.</p>
            </div>

            <form onSubmit={handleAdd} className="add-role-form">
                <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Ex: Estagiário"
                    required
                    disabled={isSaving}
                />
                <button type="submit" className="btn-primary" disabled={isSaving || !newTitle.trim()}>
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    <span>Adicionar Cargo</span>
                </button>
            </form>

            <div className="roles-list">
                {jobFunctions.map(jf => (
                    <div key={jf.id} className="role-item">
                        {editingId === jf.id ? (
                            <>
                                <input
                                    type="text"
                                    value={editingTitle}
                                    onChange={e => setEditingTitle(e.target.value)}
                                    className="edit-role-input"
                                    autoFocus
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveEdit(jf.id);
                                        if (e.key === 'Escape') handleCancelEdit();
                                    }}
                                />
                                <div className="role-actions">
                                    <button className="icon-btn-small" onClick={() => handleSaveEdit(jf.id)} disabled={isSaving}>
                                        <Check size={16} />
                                    </button>
                                    <button className="icon-btn-small" onClick={handleCancelEdit} disabled={isSaving}>
                                        <X size={16} />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <span>{jf.title}</span>
                                <div className="role-actions">
                                    <button className="icon-btn-small" onClick={() => handleStartEdit(jf.id, jf.title)}>
                                        <Pencil size={14} />
                                    </button>
                                    <button className="icon-btn-small danger" onClick={() => handleRemove(jf.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
                {jobFunctions.length === 0 && <div className="empty-state">Nenhum cargo cadastrado.</div>}
            </div>
        </div>
    );
}
