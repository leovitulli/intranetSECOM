import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import './Profile.css';

// ── Feedback inline (substitui window.alert) ──────────────────────────────────
function InlineError({ message }: { message: string }) {
    if (!message) return null;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: '#dc2626', fontSize: '0.8rem', fontWeight: 600,
            background: '#fef2f2', padding: '8px 12px', borderRadius: 8,
            border: '1px solid #fecaca', marginTop: 8,
        }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {message}
        </div>
    );
}

// ── Confirmação inline (substitui window.confirm) ─────────────────────────────
function ConfirmInline({
    message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', gap: 8,
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 10, padding: '10px 14px', marginTop: 6,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {message}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    onClick={onConfirm}
                    style={{ padding: '4px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    Confirmar
                </button>
                <button
                    onClick={onCancel}
                    style={{ padding: '4px 12px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    Cancelar
                </button>
            </div>
        </div>
    );
}

export default function ProfileRolesTab() {
    const { jobFunctions, addJobFunction, updateJobFunction, removeJobFunction } = useData();

    const [newTitle, setNewTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [editError, setEditError] = useState('');

    // ID do cargo aguardando confirmação de exclusão
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        setIsSaving(true);
        setErrorMsg('');
        try {
            await addJobFunction(newTitle.trim());
            setNewTitle('');
        } catch (error) {
            console.error(error);
            setErrorMsg('Erro ao adicionar cargo. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartEdit = (id: string, currentTitle: string) => {
        setEditingId(id);
        setEditingTitle(currentTitle);
        setEditError('');
        setConfirmRemoveId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingTitle('');
        setEditError('');
    };

    const handleSaveEdit = async (id: string) => {
        if (!editingTitle.trim()) return;
        setIsSaving(true);
        setEditError('');
        try {
            await updateJobFunction(id, editingTitle.trim());
            setEditingId(null);
        } catch (error) {
            console.error(error);
            setEditError('Erro ao salvar. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemoveConfirmed = async (id: string) => {
        setConfirmRemoveId(null);
        try {
            await removeJobFunction(id);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || 'Erro ao remover cargo.');
        }
    };

    return (
        <div className="profile-roles-tab">
            <div className="tab-header">
                <h2>Cargos do Sistema</h2>
                <p>Gerencie os nomes das funções que podem ser atribuídas à equipe.</p>
            </div>

            {/* Formulário de adição */}
            <form onSubmit={handleAdd} className="add-role-form">
                <input
                    type="text"
                    value={newTitle}
                    onChange={e => { setNewTitle(e.target.value); setErrorMsg(''); }}
                    placeholder="Ex: Estagiário"
                    required
                    disabled={isSaving}
                />
                <button type="submit" className="btn-primary" disabled={isSaving || !newTitle.trim()}>
                    {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                    <span>Adicionar Cargo</span>
                </button>
            </form>

            {/* Erro global inline */}
            <InlineError message={errorMsg} />

            {/* Lista de cargos */}
            <div className="roles-list" style={{ marginTop: errorMsg ? 8 : 0 }}>
                {jobFunctions.length === 0 && (
                    <div className="empty-state">Nenhum cargo cadastrado.</div>
                )}

                {jobFunctions.map(jf => (
                    <div key={jf.id}>
                        <div className="role-item">
                            {editingId === jf.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editingTitle}
                                        onChange={e => { setEditingTitle(e.target.value); setEditError(''); }}
                                        className="edit-role-input"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEdit(jf.id);
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                    />
                                    <div className="role-actions">
                                        <button className="icon-btn-small" onClick={() => handleSaveEdit(jf.id)} disabled={isSaving} title="Salvar">
                                            <Check size={16} />
                                        </button>
                                        <button className="icon-btn-small" onClick={handleCancelEdit} disabled={isSaving} title="Cancelar">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span>{jf.title}</span>
                                    <div className="role-actions">
                                        <button className="icon-btn-small" onClick={() => handleStartEdit(jf.id, jf.title)} title="Editar">
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="icon-btn-small danger"
                                            onClick={() => setConfirmRemoveId(confirmRemoveId === jf.id ? null : jf.id)}
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Erro de edição inline */}
                        {editingId === jf.id && editError && (
                            <InlineError message={editError} />
                        )}

                        {/* Confirmação de exclusão inline */}
                        {confirmRemoveId === jf.id && (
                            <ConfirmInline
                                message="Remover este cargo? Perfis que já o possuem não serão afetados."
                                onConfirm={() => handleRemoveConfirmed(jf.id)}
                                onCancel={() => setConfirmRemoveId(null)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
