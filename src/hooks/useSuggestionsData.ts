import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSuggestionsData() {
    const [suggestions, setSuggestions] = useState<any[]>([]);

    const addSuggestion = async (title: string, description: string, department: string, author: string, attachmentUrls?: string[]) => {
        const { data, error } = await supabase.from('suggestions').insert([{ title, description, department, author, attachment_urls: attachmentUrls }]).select().single();
        if (error) throw error;
        if (data) {
            const formatted = { ...data, date: new Date(data.created_at) };
            setSuggestions(prev => [formatted, ...prev]);
        }
    };

    const deleteSuggestion = async (id: string) => {
        const { error } = await supabase.from('suggestions').delete().eq('id', id);
        if (error) throw error;
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };

    return { suggestions, setSuggestions, addSuggestion, deleteSuggestion };
}
