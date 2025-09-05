/**
 * Unit tests for utility functions
 * Tests className merging with clsx and tailwind-merge
 */

import { cn } from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge simple class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('p-4', 'p-8');
      expect(result).toBe('p-8');
    });

    it('should handle conflicting Tailwind classes', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500');
    });

    it('should handle arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('should handle objects with conditional classes', () => {
      const result = cn({
        'base-class': true,
        'conditional-class': true,
        'hidden-class': false,
      });
      expect(result).toBe('base-class conditional-class');
    });

    it('should handle undefined and null values', () => {
      const result = cn('class1', undefined, null, 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle complex Tailwind merging scenarios', () => {
      const result = cn(
        'px-2 py-1 bg-red text-white',
        'px-4', // should override px-2
        'text-black' // should override text-white
      );
      // The exact order doesn't matter as long as the right classes are present
      expect(result).toContain('py-1');
      expect(result).toContain('bg-red');
      expect(result).toContain('px-4');
      expect(result).toContain('text-black');
      expect(result).not.toContain('px-2');
      expect(result).not.toContain('text-white');
    });
  });
});