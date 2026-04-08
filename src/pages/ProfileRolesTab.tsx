import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { Trash2, Plus, Pencil, Check, X, Loader2, AlertCircle, AlertTriangle, Shield, Search } from 'lucide-react';
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

    // Ordenação Alfabética e Filtragem em Tempo Real
    const sortedJobFunctions = [...jobFunctions].sort((a, b) => a.title.localeCompare(b.title));
    const filteredJobFunctions = sortedJobFunctions.filter(jf => 
        jf.title.toLowerCase().includes(newTitle.toLowerCase())
    );

    return (
        <div className="profile-roles-tab">
            {/* SEÇÃO 01: ADIÇÃO E BUSCA */}
            <div className="modal-section-group-premium">
                <div className="section-header-premium">
                    <span className="section-number-premium">01</span>
                    <h3>Novo Cargo</h3>
                </div>
                
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                    Digite o nome da função que deseja cadastrar. O sistema buscará cargos existentes em tempo real para evitar duplicidade.
                </p>

                {/* Formulário de adição com Busca/Autocomplete Integrada */}
                <form onSubmit={handleAdd} className="add-role-form" style={{ position: 'relative', display: 'flex', gap: '1rem', width: '100%' }}>
                    <div className="nova-pauta-field-premium" style={{ flex: 1 }}>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, color: '#94a3b8', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                className="input-premium"
                                value={newTitle}
                                onChange={e => { setNewTitle(e.target.value); setErrorMsg(''); }}
                                placeholder="Ex: Fotógrafo, Designer, Social Media..."
                                required
                                disabled={isSaving}
                                style={{ paddingLeft: 42 }}
                            />
                        </div>

                        {/* Aviso de duplicidade visual */}
                        {jobFunctions.some(jf => jf.title.toLowerCase() === newTitle.trim().toLowerCase()) && (
                            <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 800, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertTriangle size={12} /> Este cargo já existe na base de dados
                            </div>
                        )}
                    </div>
                    
                    <button 
                        type="submit" 
                        className="btn-save-premium" 
                        disabled={isSaving || !newTitle.trim() || jobFunctions.some(jf => jf.title.toLowerCase() === newTitle.trim().toLowerCase())}
                        style={{ height: '48px', minWidth: '180px', padding: '0 1.5rem' }}
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                        <span style={{ marginLeft: '8px' }}>Cadastrar</span>
                    </button>
                </form>
            </div>

            {/* SEÇÃO 02: LISTAGEM E EDIÇÃO */}
            <div className="modal-section-group-premium alternate-bg-premium">
                <div className="section-header-premium">
                    <span className="section-number-premium">02</span>
                    <h3>Banco de Funções</h3>
                </div>
                
                <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                    Clique no ícone de lápis para editar um nome ou na lixeira para remover. 
                    <span style={{ color: '#d97706', fontWeight: 600 }}> Nota:</span> Remover um cargo aqui não o retira dos perfis que já o possuem.
                </p>

                {/* Lista de cargos filtrada e ordenada */}
                <div className="roles-list">
                    {filteredJobFunctions.length === 0 && (
                        <div className="empty-state">
                            {newTitle ? 'Nenhum resultado para sua busca. Pode clicar no botão superior para cadastrar.' : 'Nenhum cargo cadastrado.'}
                        </div>
                    )}

                    {filteredJobFunctions.map(jf => (
                        <div key={jf.id}>
                            <div className="role-item">
                                {editingId === jf.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editingTitle}
                                            onChange={e => { setEditingTitle(e.target.value); setEditError(''); }}
                                            className="edit-role-input input-premium"
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Shield size={16} style={{ color: '#94a3b8' }} />
                                            <span>{jf.title}</span>
                                        </div>
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
            
            {/* Erro global inline */}
            <div style={{ padding: '0 2.5rem' }}>
                <InlineError message={errorMsg} />
            </div>
        </div>
    );
}
