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
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    useEffect(() => {
        let isActive = true;

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
                if (!isActive) return;

                console.log('🔐 Auth event:', event);

                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setUser(null);
                    setIsLoading(false);
                    setIsInitialLoad(false);
                }
            }
        );

        return () => {
            isActive = false;
            subscription.unsubscribe();
        };
    }, []);

    // Realtime listener for security stamp
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user-security-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`
                },
                (payload: any) => {
                    const newStamp = payload.new.security_stamp;
                    if (newStamp !== undefined && newStamp > (user.security_stamp || 0)) {
                        console.log('🛡️ Security stamp changed. Forcing logout...');
                        logout();
                        alert('Sua sessão foi encerrada por motivos de segurança (alteração de credenciais). Por favor, realize o login novamente.');
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, user?.security_stamp]);

    const fetchProfile = async (authUser: User) => {
        // Only set global isLoading on first fetch to prevent unmounting app shell on refresh
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (data) {
                const profile = data as any;
                setUser({
                    id: profile.id,
                    name: profile.name,
                    avatar: profile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random`,
                    role: profile.role,
                    job_titles: profile.job_titles || [],
                    security_stamp: profile.security_stamp || 0,
                    email: profile.email || authUser.email || ''
                });
            } else if (error) {
                console.error("Error fetching profile:", error);
                setUser({
                    id: authUser.id,
                    name: authUser.email || 'Usuário',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email || 'U')}&background=random`,
                    role: 'user',
                    security_stamp: 0,
                    email: authUser.email || ''
                });
            }
        } catch (e) {
            console.error("Critical error in fetchProfile:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, isLoading, logout, fetchProfile }}>
            {isInitialLoad && isLoading ? <LoadingScreen /> : children}
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
