export interface TeamMember {
    id: string;
    name: string;
    role: string;
    color: string;
    hasLogin: boolean;
    email?: string;
    pending_email?: string;
    security_stamp?: number;
    phone?: string;
    avatar_url?: string;
    job_titles?: string[];
    birth_date?: string;
}
