/**
 * NotificationsDropdown.tsx
 * Extraído do Layout.tsx para manter o componente enxuto.
 *
 * USO no Layout:
 *   import NotificationsDropdown from './NotificationsDropdown';
 *   <NotificationsDropdown />
 */
import { useState, useRef, useEffect } from 'react';
import { Bell, Check } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NotificationsDropdown() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => setIsOpen(v => !v)}>
                <Bell size={20} />
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '120%', right: 0,
                    width: 360, background: 'hsl(var(--color-surface))',
                    borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                    border: '1px solid hsl(var(--color-border))',
                    zIndex: 9999, display: 'flex', flexDirection: 'column', maxHeight: 440, overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid hsl(var(--color-border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--color-text))' }}>
                            Notificações
                        </h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'hsl(var(--color-primary))', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Check size={14} /> Marcar todas como lidas
                            </button>
                        )}
                    </div>

                    {/* Lista */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))', fontSize: '0.9rem' }}>
                                Nenhuma notificação por enquanto.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => { if (!n.read) markAsRead(n.id); }}
                                    style={{
                                        padding: '0.9rem 1.25rem',
                                        borderBottom: '1px solid hsl(var(--color-border))',
                                        background: n.read ? 'transparent' : 'hsl(var(--color-primary) / 0.05)',
                                        borderLeft: n.read ? '3px solid transparent' : '3px solid hsl(var(--color-primary))',
                                        cursor: 'pointer', transition: 'background 0.2s'
                                    }}
                                >
                                    <h4 style={{ margin: '0 0 4px', fontSize: '0.85rem', color: 'hsl(var(--color-text))', fontWeight: n.read ? 400 : 600 }}>
                                        {n.title}
                                    </h4>
                                    <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: 'hsl(var(--color-text-muted))' }}>
                                        {n.message}
                                    </p>
                                    <span style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))' }}>
                                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
