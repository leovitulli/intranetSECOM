import type { TeamMember } from '../types/team';

export const INITIAL_TEAM: TeamMember[] = [
    {
        id: '1',
        name: 'Carlos (Vídeo)',
        role: 'Cinegrafista',
        color: 'hsl(210, 100%, 50%)',
        hasLogin: true,
        email: 'carlos@secom.gov',
        phone: '(11) 98888-1111'
    },
    {
        id: '2',
        name: 'Ana (Foto)',
        role: 'Fotógrafa',
        color: 'hsl(330, 100%, 50%)',
        hasLogin: true,
        email: 'ana@secom.gov',
        phone: '(11) 98888-2222'
    },
    {
        id: '3',
        name: 'Rafael (Texto)',
        role: 'Jornalista',
        color: 'hsl(150, 80%, 40%)',
        hasLogin: true,
        email: 'rafael@secom.gov'
    },
    {
        id: '4',
        name: 'Julia (Social)',
        role: 'Social Media',
        color: 'hsl(280, 80%, 60%)',
        hasLogin: true,
        email: 'julia@secom.gov'
    },
    {
        id: '5',
        name: 'João Motorista',
        role: 'Motorista',
        color: 'hsl(30, 90%, 50%)', // Orange for drivers usually
        hasLogin: false, // No system access, just for allocation
        phone: '(11) 97777-3333'
    },
    {
        id: '6',
        name: 'Pedro Motorista',
        role: 'Motorista',
        color: 'hsl(45, 100%, 50%)',
        hasLogin: false,
        phone: '(11) 97777-4444'
    }
];
