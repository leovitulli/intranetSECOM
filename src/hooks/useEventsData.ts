import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useEventsData() {
    const [events, setEvents] = useState<any[]>([]);

    const addEvent = async (eventData: any, teamIds: string[] = []) => {
        const { data, error } = await supabase
            .from('events')
            .insert([{
                title: eventData.title,
                description: eventData.description,
                date: eventData.date.toISOString().split('T')[0],
                location: eventData.location,
                type: eventData.type,
                created_by: eventData.created_by
            }])
            .select()
            .single();

        if (error) throw error;
        if (data && teamIds.length > 0) {
            const attendees = teamIds.map((uid: any) => ({ event_id: data.id, user_id: uid }));
            await supabase.from('event_attendees').insert(attendees);
        }
        if (data) setEvents(prev => [...prev, { ...data, date: new Date(data.date + 'T12:00:00'), teamIds }]);
    };

    const updateEvent = async (eventData: any) => {
        const { id, teamIds, ...rest } = eventData;
        const { error } = await supabase
            .from('events')
            .update({
                title: rest.title,
                description: rest.description,
                date: rest.date.toISOString().split('T')[0],
                location: rest.location,
                type: rest.type
            })
            .eq('id', id);

        if (error) throw error;

        await supabase.from('event_attendees').delete().eq('event_id', id);
        if (teamIds && teamIds.length > 0) {
            const attendeesToInsert = teamIds.map((uid: any) => ({ event_id: id, user_id: uid }));
            await supabase.from('event_attendees').insert(attendeesToInsert);
        }

        setEvents(prev => prev.map(e => e.id === id ? eventData : e));
    };

    const deleteEvent = async (id: string) => {
        const { error } = await supabase.from('events').delete().eq('id', id);
        if (error) throw error;
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    return { events, setEvents, addEvent, updateEvent, deleteEvent };
}
