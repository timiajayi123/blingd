'use client';

import { useState, memo } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type SearchBarProps = {
  value: string;
  onChange: (query: string) => void;
  suggestions?: string[];
  onSubmit?: () => void;
};

const SearchBar = memo(({
  value,
  onChange,
  suggestions = [],
  onSubmit,
}: SearchBarProps) => {
  const [focused, setFocused] = useState(false);

  const handleSelect = (s: string) => {
    onChange(s);
    setFocused(false);
    if (onSubmit) onSubmit();
  };

  return (
    <div className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-sm py-4">
      <div className="relative w-full max-w-2xl mx-auto text-center space-y-6 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{
            opacity: 1,
            scale: focused ? 1.02 : 1,
            boxShadow: focused
              ? '0 8px 24px rgba(0,0,0,0.15)'
              : '0 4px 16px rgba(0,0,0,0.08)',
          }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="flex items-center rounded-2xl bg-white/90 overflow-hidden"
        >
          <Search className="ml-4 text-primary-400" size={20} />
          <input
            type="text"
            placeholder="Search for items..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
className="flex-1 px-4 py-3 text-primary-900 placeholder-primary-300 bg-transparent border-0 outline-0 focus:outline-none focus:ring-0 focus-visible:outline-none"

          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="px-3 text-primary-400 hover:text-primary-600 transition"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 font-medium transition"
            aria-label="Search"
          >
            Search
          </button>
        </motion.div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {focused && value && suggestions.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-10 max-w-2xl mx-auto overflow-hidden"
            >
              {suggestions.map((s, idx) => (
                <li
                  key={idx}
                  className="px-4 py-3 text-left text-primary-800 hover:bg-primary-50 cursor-pointer"
                  onMouseDown={() => handleSelect(s)}
                >
                  {s}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default SearchBar;
