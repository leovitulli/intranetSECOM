import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import './TeamMultiSelect.css';

interface TeamMultiSelectProps {
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

export default function TeamMultiSelect({ selected, onChange, placeholder = "Selecione responsáveis..." }: TeamMultiSelectProps) {
    const { team } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Listagem dinâmica da equipe ordenada alfabeticamente
    const sortedTeam = [...team].sort((a, b) => a.name.localeCompare(b.name));
    
    const filtered = sortedTeam.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase()) && !selected.includes(m.name)
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (name: string) => {
        const newSelected = [...selected, name];
        onChange(newSelected);
        setQuery('');
        inputRef.current?.focus();
    };

    const removeOption = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter(s => s !== name));
    };

    return (
        <div className="tms-container" ref={containerRef}>
            <div 
                className={`tms-trigger-new ${isOpen ? 'active' : ''}`}
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                <div className="tms-content-wrapper">
                    <div className="tms-pills">
                        {selected.map(name => (
                            <span key={name} className="tms-pill">
                                {name}
                                <button
                                    type="button"
                                    className="tms-pill-remove"
                                    onClick={(e) => removeOption(name, e)}
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))}
                    </div>
                    
                    <input
                        ref={inputRef}
                        type="text"
                        className="tms-input-field"
                        placeholder={selected.length === 0 ? placeholder : ''}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
                <ChevronDown size={16} className={`tms-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="tms-dropdown-new">
                    <ul className="tms-list">
                        {filtered.length === 0 ? (
                            <li className="tms-no-results" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                                {query ? 'Nenhum membro encontrado.' : 'Digite para buscar colaboradores...'}
                            </li>
                        ) : (
                            filtered.map(member => (
                                <li
                                    key={member.id}
                                    className="tms-option"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOption(member.name);
                                    }}
                                >
                                    <div className="tms-option-avatar" style={{ backgroundColor: member.color || '#3b82f6' }}>
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>{member.name.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="tms-option-info">
                                        <span className="tms-option-name">{member.name}</span>
                                        <span className="tms-option-role">
                                            {member.job_titles && member.job_titles.length > 0 ? member.job_titles[0] : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                        </span>
                                    </div>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
