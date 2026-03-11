import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
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

    const filtered = team.filter(m =>
        m.name.toLowerCase().includes(query.toLowerCase())
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
        const newSelected = selected.includes(name)
            ? selected.filter(s => s !== name)
            : [...selected, name];
        onChange(newSelected);
    };

    const removeOption = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(selected.filter(s => s !== name));
    };

    return (
        <div className="tms-container" ref={containerRef}>
            <div
                className="tms-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="tms-pills">
                    {selected.length === 0 ? (
                        <span className="tms-placeholder">{placeholder}</span>
                    ) : (
                        selected.map(name => (
                            <span
                                key={name}
                                className="tms-pill"
                            >
                                {name}
                                <button
                                    type="button"
                                    className="tms-pill-remove"
                                    onClick={(e) => removeOption(name, e)}
                                >
                                    <X size={10} />
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={16} className={`tms-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="tms-dropdown">
                    <div className="tms-search">
                        <Search size={14} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Buscar membro..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                    </div>
                    <ul className="tms-list">
                        {filtered.length === 0 && (
                            <li className="tms-no-results" style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                                Nenhum membro encontrado.
                            </li>
                        )}
                        {filtered.map(member => (
                            <li
                                key={member.id}
                                className={`tms-option ${selected.includes(member.name) ? 'selected' : ''}`}
                                onClick={() => toggleOption(member.name)}
                            >
                                <div className="tms-option-check">
                                    {selected.includes(member.name) && <div style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: 1 }} />}
                                </div>
                                <div className="tms-option-info">
                                    <span className="tms-option-name">{member.name}</span>
                                    <span className="tms-option-role">
                                        {member.job_titles && member.job_titles.length > 0 ? member.job_titles[0] : (member.role === 'motorista' ? 'Motorista' : 'Colaborador')}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
