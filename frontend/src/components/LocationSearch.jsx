import { useState, useRef, useEffect, useCallback } from 'react';
import rankAPI from '../services/api';

/**
 * Reusable searchable location dropdown for US cities.
 * Props:
 *   value       - currently selected location value string (sent to API)
 *   onChange    - callback(value: string) when user picks a location
 *   placeholder - input placeholder text
 *   id          - input element id (for accessibility)
 */
export default function LocationSearch({ value, onChange, placeholder = 'Search city...', id }) {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    // Displayed text: show short label if selected, otherwise the typed query
    const displayText = value
        ? (options.find(o => o.value === value)?.display || value.split(',')[0])
        : query;

    // Initial load: show top 25 locations when input is focused with no query
    const loadInitial = useCallback(async () => {
        setLoading(true);
        try {
            const data = await rankAPI.searchLocations('');
            setOptions(data.locations || []);
        } catch {
            setOptions([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const search = useCallback((q) => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const data = await rankAPI.searchLocations(q);
                setOptions(data.locations || []);
                setHighlighted(-1);
            } catch {
                setOptions([]);
            } finally {
                setLoading(false);
            }
        }, 200);
    }, []);

    const handleInputChange = (e) => {
        const q = e.target.value;
        setQuery(q);
        // Clear selection if user types something new
        if (value) onChange('');
        setIsOpen(true);
        if (q.trim().length === 0) {
            loadInitial();
        } else {
            search(q);
        }
    };

    const handleFocus = () => {
        setIsOpen(true);
        if (options.length === 0) loadInitial();
    };

    const handleSelect = (loc) => {
        onChange(loc.value);
        setQuery('');
        setIsOpen(false);
        setHighlighted(-1);
    };

    const handleKeyDown = (e) => {
        if (!isOpen) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted(h => Math.min(h + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted(h => Math.max(h - 1, 0));
        } else if (e.key === 'Enter' && highlighted >= 0) {
            e.preventDefault();
            handleSelect(options[highlighted]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setIsOpen(false);
        inputRef.current?.focus();
    };

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div className="loc-search" ref={containerRef}>
            <div className={`loc-search-input-wrap ${isOpen ? 'open' : ''}`}>
                {value && !isOpen ? (
                    <div className="loc-selected" onClick={() => {
                        setIsOpen(true);
                        setQuery('');
                        setTimeout(() => inputRef.current?.focus(), 0);
                    }}>
                        <span className="loc-selected-pin">📍</span>
                        <span className="loc-selected-text">
                            {/* Show "City, ST" short form if possible */}
                            {options.find(o => o.value === value)?.display || value.split(',')[0].trim()}
                        </span>
                        <button className="loc-clear-btn" onClick={handleClear} title="Clear location">×</button>
                    </div>
                ) : (
                    <input
                        ref={inputRef}
                        id={id}
                        type="text"
                        className="loc-input"
                        value={value && !isOpen ? '' : query}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        placeholder={value ? value.split(',')[0] : placeholder}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={isOpen}
                    />
                )}
                {loading && <span className="loc-spinner" />}
            </div>

            {isOpen && (
                <ul className="loc-dropdown" role="listbox">
                    {options.length === 0 && !loading && (
                        <li className="loc-empty">No cities found</li>
                    )}
                    {options.map((loc, i) => (
                        <li
                            key={loc.value}
                            role="option"
                            aria-selected={highlighted === i}
                            className={`loc-option ${highlighted === i ? 'loc-option-hl' : ''}`}
                            onMouseDown={() => handleSelect(loc)}
                            onMouseEnter={() => setHighlighted(i)}
                        >
                            <span className="loc-option-city">{loc.display.split(',')[0]}</span>
                            <span className="loc-option-state">{loc.display.split(',').slice(1).join(',')}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
