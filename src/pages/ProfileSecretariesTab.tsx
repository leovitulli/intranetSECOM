import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertCircle, AlertTriangle, Building2, Search } from 'lucide-react';
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

export default function ProfileSecretariesTab() {
    const { secretarias, addSecretaria, updateSecretaria, removeSecretaria } = useData();

    const [newName, setNewName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editError, setEditError] = useState('');

    // ID da secretaria aguardando confirmação de exclusão
    const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setIsSaving(true);
        setErrorMsg('');
        try {
            await addSecretaria(newName.trim());
            setNewName('');
        } catch (error) {
            console.error(error);
            setErrorMsg('Erro ao adicionar secretaria. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleStartEdit = (id: string, currentName: string) => {
        setEditingId(id);
        setEditingName(currentName);
        setEditError('');
        setConfirmRemoveId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditError('');
    };

    const handleSaveEdit = async (id: string) => {
        if (!editingName.trim()) return;
        setIsSaving(true);
        setEditError('');
        try {
            await updateSecretaria(id, editingName.trim());
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
            await removeSecretaria(id);
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message || 'Erro ao remover secretaria.');
        }
    };

    // Ordenação Alfabética e Filtragem em Tempo Real
    const sortedSecretarias = [...secretarias].sort((a, b) => a.nome.localeCompare(b.nome));
    const filteredSecretarias = sortedSecretarias.filter(s => 
        s.nome.toLowerCase().includes(newName.toLowerCase())
    );

    return (
        <div className="profile-roles-tab">
            <div className="tab-header">
                <h2>Gerenciar Secretarias</h2>
                <p>Gerencie os nomes dos departamentos e secretarias disponíveis no sistema.</p>
            </div>

            {/* Formulário de adição com Busca/Autocomplete Integrada */}
            <form onSubmit={handleAdd} className="add-role-form" style={{ position: 'relative', marginBottom: 24 }}>
                <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                        type="text"
                        value={newName}
                        onChange={e => { setNewName(e.target.value); setErrorMsg(''); }}
                        placeholder="Digite para buscar ou adicionar uma nova secretaria..."
                        required
                        disabled={isSaving}
                        style={{ width: '100%', paddingLeft: 40 }}
                    />

                    {/* Aviso de duplicidade visual */}
                    {secretarias.some(s => s.nome.toLowerCase() === newName.trim().toLowerCase()) && (
                        <div style={{ position: 'absolute', bottom: -18, left: 40, fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700 }}>
                            ⚠️ Esta secretaria já está cadastrada
                        </div>
                    )}
                </div>
                
                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isSaving || !newName.trim() || secretarias.some(s => s.nome.toLowerCase() === newName.trim().toLowerCase())}
                    style={{ minWidth: 200 }}
                >
                    {isSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
                    <span>Adicionar Secretaria</span>
                </button>
            </form>

            {/* Erro global inline */}
            <InlineError message={errorMsg} />

            {/* Lista de secretarias filtrada e ordenada */}
            <div className="roles-list" style={{ marginTop: errorMsg ? 8 : 0 }}>
                {filteredSecretarias.length === 0 && (
                    <div className="empty-state">
                        {newName ? 'Nenhum resultado para sua busca. Clique no botão ao lado para adicionar esta nova secretaria.' : 'Nenhuma secretaria cadastrada.'}
                    </div>
                )}

                {filteredSecretarias.map(sec => (
                    <div key={sec.id}>
                        <div className="role-item">
                            {editingId === sec.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editingName}
                                        onChange={e => { setEditingName(e.target.value); setEditError(''); }}
                                        className="edit-role-input"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') handleSaveEdit(sec.id);
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                    />
                                    <div className="role-actions">
                                        <button className="icon-btn-small" onClick={() => handleSaveEdit(sec.id)} disabled={isSaving} title="Salvar">
                                            <Check size={16} />
                                        </button>
                                        <button className="icon-btn-small" onClick={handleCancelEdit} disabled={isSaving} title="Cancelar">
                                            <X size={16} />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Building2 size={16} style={{ color: '#94a3b8' }} />
                                        <span>{sec.nome}</span>
                                    </div>
                                    <div className="role-actions">
                                        <button className="icon-btn-small" onClick={() => handleStartEdit(sec.id, sec.nome)} title="Editar">
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            className="icon-btn-small danger"
                                            onClick={() => setConfirmRemoveId(confirmRemoveId === sec.id ? null : sec.id)}
                                            title="Remover"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Erro de edição inline */}
                        {editingId === sec.id && editError && (
                            <InlineError message={editError} />
                        )}

                        {/* Confirmação de exclusão inline */}
                        {confirmRemoveId === sec.id && (
                            <ConfirmInline
                                message="Remover esta secretaria? Isso pode afetar filtros existentes."
                                onConfirm={() => handleRemoveConfirmed(sec.id)}
                                onCancel={() => setConfirmRemoveId(null)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
