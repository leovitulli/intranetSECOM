import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus } from 'lucide-react';
import './Profile.css';

export default function ProfileRolesTab() {
    const { jobFunctions, addJobFunction, removeJobFunction } = useData();
    const [newTitle, setNewTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

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

    const handleRemove = async (id: string) => {
        if (confirm("Tem certeza que deseja remover este cargo do sistema?")) {
            try {
                await removeJobFunction(id);
            } catch (error) {
                console.error(error);
                alert("Erro ao remover cargo.");
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
                />
                <button type="submit" className="btn-primary" disabled={isSaving || !newTitle.trim()}>
                    <Plus size={16} /> Adicionar Cargo
                </button>
            </form>

            <div className="roles-list">
                {jobFunctions.map(jf => (
                    <div key={jf.id} className="role-item">
                        <span>{jf.title}</span>
                        <button className="icon-btn-small danger" onClick={() => handleRemove(jf.id)}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
                {jobFunctions.length === 0 && <div className="empty-state">Nenhum cargo cadastrado.</div>}
            </div>
        </div>
    );
}
