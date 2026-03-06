import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

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
        // Only one auth listener needed. It handles initial session and all changes.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔔 Auth Event:', event);

                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setUser(null);
                    setIsLoading(false);
                }
            }
        );

        return () => subscription.unsubscribe();
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
                (payload) => {
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
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (data) {
                setUser({
                    id: data.id,
                    name: data.name,
                    avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
                    role: data.role,
                    job_titles: data.job_titles || [],
                    security_stamp: data.security_stamp || 0,
                    email: data.email || authUser.email || ''
                });
            } else if (error) {
                console.error("Error fetching profile:", error);
                // Fallback if profile not found yet
                setUser({
                    id: authUser.id,
                    name: authUser.email || 'Usuário',
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.email || 'U')}&background=random`,
                    role: 'user',
                    security_stamp: 0,
                    email: authUser.email || ''
                });
            }
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
            {!isLoading && children}
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
