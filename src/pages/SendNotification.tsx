import { useState } from 'react';
import { Bell, Send, Users, User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import './SendNotification.css';

export default function SendNotification() {
    const { team } = useData();
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetMode, setTargetMode] = useState<'all' | 'select'>('all');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sending, setSending] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const toggleMember = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) return;

        setSending(true);
        setSuccessMsg('');

        try {
            let targetIds: string[] = [];

            if (targetMode === 'all') {
                // Get all user IDs
                const { data } = await supabase.from('users').select('id');
                targetIds = (data || []).map((u: any) => u.id);
            } else {
                targetIds = selectedIds;
            }

            if (targetIds.length === 0) {
                alert('Selecione pelo menos uma pessoa.');
                setSending(false);
                return;
            }

            const notifs = targetIds.map(uid => ({
                user_id: uid,
                title,
                message,
                module: 'broadcast',
                read: false
            }));

            const { error } = await supabase.from('notifications').insert(notifs);

            if (error) throw error;

            setTitle('');
            setMessage('');
            setSelectedIds([]);
            setSuccessMsg(`✅ Notificação enviada para ${targetIds.length} ${targetIds.length === 1 ? 'pessoa' : 'pessoas'}!`);

            setTimeout(() => setSuccessMsg(''), 5000);
        } catch (err) {
            alert('Erro ao enviar notificação.');
        } finally {
            setSending(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <h1>Acesso Restrito</h1>
                    <p className="subtitle">Apenas administradores podem enviar notificações.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container send-notif-page">
            <div className="page-header">
                <div>
                    <h1><Bell size={24} style={{ display: 'inline', marginRight: '0.5rem' }} />Enviar Notificação</h1>
                    <p className="subtitle">Envie alertas e avisos diretamente para a equipe.</p>
                </div>
            </div>

            <div className="send-notif-layout">
                {/* Form */}
                <form className="send-notif-form glass" onSubmit={handleSend}>
                    <h2>Compor Mensagem</h2>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Bell size={16} className="text-primary" />
                            Título da Notificação *
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Pauta urgente de cobertura ou nova instrução..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            maxLength={80}
                            required
                        />
                        <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            O título aparece em destaque (negrito) nas notificações do usuário. Máximo 80 caracteres.
                        </span>
                    </div>

                    <div className="form-group">
                        <label>Conteúdo / Mensagem *</label>
                        <textarea
                            rows={4}
                            placeholder="Descreva os detalhes importantes da notificação, como data, horário, local ou ação necessária..."
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            required
                        />
                        <span className="field-help-text" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            Mantenha o texto objetivo e claro para que a equipe compreenda rapidamente.
                        </span>
                    </div>

                    <div className="form-group">
                        <label>Destinatários</label>
                        <div className="v3-view-toggle" style={{ width: '100%' }}>
                            <button
                                type="button"
                                className={`toggle-btn ${targetMode === 'all' ? 'active' : ''}`}
                                onClick={() => setTargetMode('all')}
                                style={{ flex: 1 }}
                            >
                                <Users size={16} /> Toda a Equipe
                            </button>
                            <button
                                type="button"
                                className={`toggle-btn ${targetMode === 'select' ? 'active' : ''}`}
                                onClick={() => setTargetMode('select')}
                                style={{ flex: 1 }}
                            >
                                <User size={16} /> Selecionar Pessoas
                            </button>
                        </div>
                    </div>

                    {targetMode === 'select' && (
                        <div className="member-picker">
                            {team.map((member: any) => (
                                <label key={member.id} className={`member-chip ${selectedIds.includes(member.id) ? 'selected' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.includes(member.id)}
                                        onChange={() => toggleMember(member.id)}
                                        style={{ display: 'none' }}
                                    />
                                    <img
                                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                        alt={member.name}
                                        style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }}
                                    />
                                    <span>{member.name}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {successMsg && (
                        <div style={{ background: 'hsl(var(--color-primary) / 0.1)', border: '1px solid hsl(var(--color-primary) / 0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', color: 'hsl(var(--color-primary))', fontWeight: 500, fontSize: '0.9rem' }}>
                            {successMsg}
                        </div>
                    )}

                    <button type="submit" className="btn-primary-v3" disabled={sending} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                        <Send size={18} />
                        {sending ? 'Enviando...' : 'Enviar Notificação Premium'}
                    </button>
                </form>

                {/* Preview */}
                <div className="send-notif-preview glass">
                    <h2>Visualização em Tempo Real (Preview)</h2>
                    <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem' }}>
                        Veja abaixo como seu alerta será exibido para o smartphone e o painel dos destinatários:
                    </p>
                    
                    <div className="notif-preview-card">
                        <div className="notif-preview-title">
                            {title || 'Título da sua notificação'}
                        </div>
                        <div className="notif-preview-message">
                            {message || 'O conteúdo da sua mensagem aparecerá aqui conforme você digita...'}
                        </div>
                        <div className="notif-preview-time">agora mesmo</div>
                    </div>

                    <div style={{ marginTop: 'auto', padding: '1rem', background: 'hsl(var(--color-primary) / 0.05)', borderRadius: 'var(--radius-xl)', fontSize: '0.8rem', color: 'hsl(var(--color-primary))', border: '1px dashed hsl(var(--color-primary) / 0.3)' }}>
                        <strong>Dica de UX:</strong> Tente ser o mais claro possível para que os destinatários compreendam o chamado imediatamente sem necessidade de confirmações adicionais.
                    </div>
                </div>
            </div>
        </div>
    );
}
