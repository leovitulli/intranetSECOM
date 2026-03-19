import { useState, useRef, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import './SecretariasMultiSelect.css';

interface SecretariasMultiSelectProps {
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

export default function SecretariasMultiSelect({ selected, onChange, placeholder = 'Selecione secretarias...' }: SecretariasMultiSelectProps) {
    const { secretarias } = useData();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Lista dinâmica do banco ordenada alfabeticamente
    const listaSecretarias = [...secretarias]
        .sort((a, b) => a.nome.localeCompare(b.nome))
        .map(s => s.nome);

    const filtered = listaSecretarias.filter(s =>
        s.toLowerCase().includes(query.toLowerCase()) && !selected.includes(s)
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
        <div className="sms-container" ref={containerRef}>
            <div 
                className={`sms-trigger-new ${isOpen ? 'active' : ''}`}
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                <div className="sms-content-wrapper">
                    <div className="sms-pills">
                        {selected.map(name => (
                            <span key={name} className="sms-pill">
                                {name}
                                <button
                                    type="button"
                                    className="sms-pill-remove"
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
                        className="sms-input-field"
                        placeholder={selected.length === 0 ? placeholder : ''}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
                <ChevronDown size={16} className={`sms-chevron ${isOpen ? 'open' : ''}`} />
            </div>

            {isOpen && (
                <div className="sms-dropdown-new">
                    <ul className="sms-list">
                        {filtered.length === 0 ? (
                            <li className="sms-no-results">
                                {query ? 'Nenhuma secretaria encontrada.' : 'Digite para buscar...'}
                            </li>
                        ) : (
                            filtered.map(name => (
                                <li
                                    key={name}
                                    className="sms-option"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOption(name);
                                    }}
                                >
                                    {name}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
