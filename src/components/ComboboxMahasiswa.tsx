import React, { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown } from 'lucide-react';
import { Mahasiswa } from '../types';

interface ComboboxMahasiswaProps {
  id?: string;
  mahasiswa: Mahasiswa[];
  value: string;
  onChange: (npm: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function ComboboxMahasiswa({
  id,
  mahasiswa,
  value,
  onChange,
  placeholder = 'Cari mahasiswa...',
  required,
  disabled
}: ComboboxMahasiswaProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = mahasiswa.find(m => m.npm === value);

  // Sync inputValue when value changes externally (editing)
  useEffect(() => {
    setInputValue(selected ? `${selected.nama} (${selected.npm})` : '');
  }, [value]);

  const filtered = mahasiswa.filter(m => {
    const q = inputValue.toLowerCase();
    return m.nama.toLowerCase().includes(q) || m.npm.includes(q);
  });

  const handleSelect = (m: Mahasiswa) => {
    onChange(m.npm);
    setInputValue(`${m.nama} (${m.npm})`);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowDropdown(true);
    setHighlightIdx(0);
    if (!e.target.value) {
      onChange('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlightIdx]) {
      e.preventDefault();
      handleSelect(filtered[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const listboxId = id ? `${id}-listbox` : 'combobox-mhs-listbox';

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/40 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={showDropdown && filtered[highlightIdx] ? `mhs-opt-${filtered[highlightIdx].npm}` : undefined}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={(e) => { setShowDropdown(true); setHighlightIdx(0); (e.target as HTMLInputElement).select(); }}
          onClick={(e) => { setShowDropdown(true); (e.target as HTMLInputElement).select(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full text-sm pl-9 pr-8 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
        <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-main)]/30 pointer-events-none" />
      </div>

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Pilihan Mahasiswa"
          className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
        >
          {filtered.length > 0 ? (
            filtered.map((m, i) => {
              const isHighlighted = i === highlightIdx;
              const isSelected = value === m.npm;
              return (
                <button
                  key={m.npm}
                  id={`mhs-opt-${m.npm}`}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onMouseDown={() => handleSelect(m)}
                  onMouseEnter={() => setHighlightIdx(i)}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm transition cursor-pointer ${
                    isHighlighted
                      ? 'bg-[var(--color-primary)] text-white'
                      : isSelected
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-text-main)] hover:bg-gray-50'
                  }`}
                >
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 shrink-0 ${isHighlighted ? 'text-white' : 'text-[var(--color-primary)]'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{m.nama}</span>
                    <span className={`block text-[10px] font-mono truncate ${isHighlighted ? 'text-white/85' : 'text-gray-500'}`}>
                      {m.npm} · {m.angkatan}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-4 text-xs text-gray-500 text-center">
              Tidak ditemukan mahasiswa dengan kata kunci "{inputValue}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
