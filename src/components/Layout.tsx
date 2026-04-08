import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Bell, Search, CalendarDays, CalendarClock, BarChart3, Check, X, Menu, AlignEndHorizontal, Zap, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useData } from '../contexts/DataContext';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Layout.css';

export default function Layout() {
    const { user, logout } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const { searchTerm, setSearchTerm, onlineUsers } = useData();
    const isAdmin = user?.role === 'admin' || user?.role === 'desenvolvedor';
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
        const stored = localStorage.getItem('sidebarLocked');
        return stored === 'true'; // Default to false (collapsed) if not set
    });
    const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    useEffect(() => {
        localStorage.setItem('sidebarLocked', String(isSidebarLocked));
    }, [isSidebarLocked]);

    // Network Status Listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="layout-container">
            {/* Overlay mobile */}
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
            )}
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''} ${!isSidebarLocked ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo" onClick={() => setIsSidebarLocked(!isSidebarLocked)} style={{ cursor: 'pointer' }}>
                        <div className="logo-brand">
                            <span className="brand-prefix">SECOM</span>
                            <span className="brand-dot"></span>
                        </div>
                        <div className="logo-text-group">
                            <h2>Comunica Hub</h2>
                            <span className="logo-version">v2.0</span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon-box"><LayoutDashboard size={20} /></div>
                        <span>Gestão de Pautas</span>
                    </NavLink>

                    <NavLink
                        to="/agenda"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon-box"><CalendarClock size={20} /></div>
                        <span>Agenda Externa</span>
                    </NavLink>

                    <NavLink
                        to="/cronograma"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon-box"><AlignEndHorizontal size={20} /></div>
                        <span>Cronograma Semanal</span>
                    </NavLink>

                    <NavLink
                        to="/calendario"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon-box"><CalendarDays size={20} /></div>
                        <span>Calendário</span>
                    </NavLink>


                    <NavLink
                        to="/relatorios"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <div className="nav-icon-box"><BarChart3 size={20} /></div>
                        <span>Produtividade</span>
                    </NavLink>

                    {isAdmin && (
                        <NavLink
                            to="/radar-noticias"
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <div className="nav-icon-box"><Zap size={20} /></div>
                            <span>Notícias SECOM</span>
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <NavLink to="/perfil" className="user-profile-premium" title="Ver Perfil">
                        <div className="avatar-container">
                            <img src={user?.avatar} alt={user?.name} className="premium-avatar" />
                            {!user?.birth_date && <div className="nudge-dot-premium" title="Perfil incompleto">!</div>}
                            <div className={`online-ring ${!isOnline ? 'offline' : ''}`} title={isOnline ? 'Conectado' : 'Sem Internet'}></div>
                        </div>
                        <div className="user-meta">
                            <span className="meta-name">{user?.name}</span>
                            <span className="meta-role">
                                {user?.job_titles && user.job_titles.length > 0 ? user.job_titles[0] : user?.role}
                            </span>
                        </div>
                    </NavLink>
                    <button onClick={logout} className="logout-btn-premium" title="Sair do Sistema">
                        <LogOut size={20} />
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="main-wrapper">
                <header className="topbar glass">
                    <button
                        className="hamburger-btn"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Menu"
                    >
                        <Menu size={22} />
                    </button>
                    <div className="search-bar">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                className="icon-btn-small clear-search"
                                onClick={() => setSearchTerm('')}
                                title="Limpar"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {user?.role === 'desenvolvedor' && (
                        <div className="online-users-indicator">
                            <div className="online-avatars-list">
                                {onlineUsers.map(u => (
                                    <div key={u.id} className="online-avatar-wrapper" title={`${u.name} (Online)`}>
                                        <img src={u.avatar} alt={u.name} className="online-avatar" />
                                        <span className="online-status-dot"></span>
                                    </div>
                                ))}
                            </div>
                            <span className="online-count-hint">{onlineUsers.length} online</span>
                        </div>
                    )}
                    <div className="topbar-actions" ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                            className="icon-btn theme-toggle" 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Noturno"}
                        >
                            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <button className="icon-btn" onClick={() => setIsNotifOpen(!isNotifOpen)}>
                            <Bell size={20} />
                            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
                        </button>

                        {isNotifOpen && (
                            <div className="notifications-dropdown" style={{
                                position: 'absolute',
                                top: '120%',
                                right: 0,
                                width: '360px',
                                background: 'hsl(var(--color-surface))',
                                borderRadius: '14px',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
                                border: '1px solid hsl(var(--color-border))',
                                zIndex: 9999,
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: '440px',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid hsl(var(--color-border))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'hsl(var(--color-text))' }}>Notificações</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={() => markAllAsRead()}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Check size={14} /> Marcar todas como lidas
                                        </button>
                                    )}
                                </div>
                                <div style={{ overflowY: 'auto', flex: 1 }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--color-text-muted))', fontSize: '0.9rem' }}>
                                            Nenhuma notificação por enquanto.
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    if (!n.read) markAsRead(n.id);
                                                }}
                                                style={{
                                                    padding: '0.9rem 1.25rem',
                                                    borderBottom: '1px solid hsl(var(--color-border))',
                                                    background: n.read ? 'transparent' : 'hsl(var(--color-primary) / 0.05)',
                                                    borderLeft: n.read ? '3px solid transparent' : '3px solid hsl(var(--color-primary))',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'hsl(var(--color-text))', fontWeight: n.read ? 400 : 600 }}>{n.title}</h4>
                                                <p style={{ margin: '0 0 6px 0', fontSize: '0.78rem', color: 'hsl(var(--color-text-muted))' }}>{n.message}</p>
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
                </header>

                <main className="content-area">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
