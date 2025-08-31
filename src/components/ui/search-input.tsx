import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  debounce?: number; // milliseconds to debounce input
  className?: string;
  disabled?: boolean;
}

export function SearchInput({ 
  placeholder, 
  value, 
  onChange, 
  debounce = 300,
  className,
  disabled = false
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(value);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounce);

    return () => clearTimeout(timer);
  }, [internalValue, debounce, onChange, value]);

  // Sync internal value with prop value (for external updates)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  return (
    <div className={cn("relative search-input-container", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-700" />
      <Input
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        className="pl-10 search-input-container input"
        disabled={disabled}
      />
    </div>
  );
}