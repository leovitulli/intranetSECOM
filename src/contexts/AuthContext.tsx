import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import LoadingScreen from '../components/LoadingScreen';

export interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    role: string;
    job_titles?: string[];
    security_stamp: number;
    email: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    user: UserProfile | null;
    isLoading: boolean;
    logout: () => Promise<void>;
    fetchProfile: (authUser: User) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isActive = true;

        supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
            if (!isActive) return;
            if (session?.user) {
                fetchProfile(session.user);
            } else {
                setIsLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (!isActive) return;

                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    setIsLoading(false);
                } else if (event === 'SIGNED_IN' && session?.user) {
                    await fetchProfile(session.user);
                } else if (event === 'TOKEN_REFRESHED' && session?.user) {
                    setIsLoading(false);
                }
            }
        );

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user-security-${user.id}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
                (payload: any) => {
                    const newStamp = payload.new.security_stamp;
                    if (newStamp !== undefined && newStamp > (user.security_stamp || 0)) {
                        logout();
                    }
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user?.id, user?.security_stamp]);

    const fetchProfile = async (authUser: User) => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, name, avatar_url, role, job_titles, security_stamp, email')
                .eq('id', authUser.id)
                .single();

            if (data) {
                setUser({
                    id: data.id,
                    name: data.name,
                    avatar: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
                    role: data.role,
                    job_titles: data.job_titles || [],
                    security_stamp: data.security_stamp || 0,
                    email: data.email || authUser.email || '',
                });
            } else if (error) {
                console.error('Error fetching profile:', error);
                setUser({
                    id: authUser.id,
                    name: authUser.email || 'Usuário',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email || 'U')}&background=random`,
                    role: 'user',
                    security_stamp: 0,
                    email: authUser.email || '',
                });
            }
        } catch (e) {
            console.error('Critical error in fetchProfile:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (isLoading) return <LoadingScreen />;

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, logout, fetchProfile }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
