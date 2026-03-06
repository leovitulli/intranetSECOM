import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { Bell } from 'lucide-react';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    module?: string;
    read: boolean;
    action_url?: string;
    created_at: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [toasts, setToasts] = useState<Notification[]>([]);
    const [alertModal, setAlertModal] = useState<Notification | null>(null);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const fetchExisting = async () => {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (data && !error) setNotifications(data);
        };

        fetchExisting();

        const channel = supabase
            .channel(`notifications-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications(prev => [newNotif, ...prev]);

                    // Broadcast from admin → full-screen blocking modal
                    if (newNotif.module === 'broadcast') {
                        setAlertModal(newNotif);
                    } else {
                        showToast(newNotif);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    const showToast = (notif: Notification) => {
        setToasts(prev => [...prev, notif]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== notif.id));
        }, 5000);
        try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => { });
        } catch (e) { }
    };

    const markAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await supabase.from('notifications').update({ read: true }).eq('id', id);
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
        if (unreadIds.length === 0) return;
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    };

    const dismissAlert = async () => {
        if (alertModal) {
            await markAsRead(alertModal.id);
            setAlertModal(null);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead }}>
            {children}

            {/* ========== BLOCKING ALERT MODAL ========== */}
            {alertModal && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 99999,
                        background: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        animation: 'fadeInOverlay 0.2s ease'
                    }}
                >
                    <div
                        style={{
                            background: 'hsl(var(--color-surface))',
                            borderRadius: '24px',
                            padding: '2.5rem 2rem',
                            maxWidth: '480px',
                            width: '100%',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.45)',
                            border: '1px solid hsl(var(--color-border))',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1.25rem',
                            textAlign: 'center',
                            animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                        }}
                    >
                        <div style={{
                            width: '68px',
                            height: '68px',
                            borderRadius: '50%',
                            background: 'hsl(var(--color-primary) / 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Bell size={32} color="hsl(var(--color-primary))" />
                        </div>

                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'hsl(var(--color-text))', lineHeight: 1.3 }}>
                            {alertModal.title}
                        </h2>

                        <p style={{ margin: 0, fontSize: '1rem', color: 'hsl(var(--color-text-muted))', lineHeight: 1.65, maxWidth: '380px' }}>
                            {alertModal.message}
                        </p>

                        <button
                            onClick={dismissAlert}
                            style={{
                                marginTop: '0.5rem',
                                padding: '0.8rem 3.5rem',
                                borderRadius: '99px',
                                background: 'hsl(var(--color-primary))',
                                color: 'white',
                                border: 'none',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px hsl(var(--color-primary) / 0.4)',
                                transition: 'opacity 0.15s, transform 0.1s'
                            }}
                            onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                            onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                            OK, entendido!
                        </button>
                    </div>
                </div>
            )}

            {/* ========== TOAST NOTIFICATIONS ========== */}
            <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className="animate-slide-up"
                        style={{
                            background: 'hsl(var(--color-surface))',
                            padding: '1rem',
                            borderRadius: '12px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                            borderLeft: '4px solid hsl(var(--color-primary))',
                            width: '320px',
                            cursor: 'pointer'
                        }}
                        onClick={() => setToasts(prev => prev.filter(to => to.id !== t.id))}
                    >
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'hsl(var(--color-text))' }}>{t.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'hsl(var(--color-text-muted))' }}>{t.message}</p>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes popIn {
                    from { transform: scale(0.82); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotifications must be used within NotificationProvider');
    return context;
}
