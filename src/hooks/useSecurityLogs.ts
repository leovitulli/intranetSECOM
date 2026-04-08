import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface SecurityEvent {
    id: string;
    user_id: string;
    user_name: string;
    target_id: string;
    target_type: string;
    action_type: string;
    details: string;
    created_at: string;
}

export function useSecurityLogs() {
    const [securityLogs, setSecurityLogs] = useState<SecurityEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSecurityLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('security_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            if (data) setSecurityLogs(data);
        } catch (err: any) {
            console.error('Error fetching security logs:', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSecurityLogs();

        const channel = supabase.channel('realtime-security-logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_logs' }, (payload: any) => {
                setSecurityLogs(prev => [payload.new, ...prev].slice(0, 100));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    return { securityLogs, loading, refetch: fetchSecurityLogs };
}
