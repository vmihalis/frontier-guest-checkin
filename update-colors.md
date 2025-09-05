# Color Update Summary

## Completed Pages
1. ✅ Admin Page - Fully updated with dark mode support
2. ✅ Landing Page - Updated with semantic colors
3. ✅ Login Page - Updated with semantic colors

## Remaining Pages Need Updates

### Check-in Page (`/checkin`)
- Replace `bg-white` → `bg-card`
- Replace `text-gray-*` → `text-foreground` or `text-muted-foreground`
- Replace `border-gray-*` → `border-border`
- Update button colors to use variants

### Invites Page (`/invites`) - LARGEST UPDATE NEEDED
- Replace `bg-gray-50` → `bg-muted`
- Replace `bg-white` → `bg-card`
- Replace all `text-gray-*` colors
- Update status badges (green, gray)
- Fix gradient backgrounds

### Accept Token Page (`/accept/[token]`)
- Replace `bg-gray-50` → `bg-muted`
- Replace gradient backgrounds with dark-mode variants
- Update all text colors
- Fix success/error states

## Global Replacements Needed
- `bg-white` → `bg-card` or `bg-background`
- `bg-gray-50` → `bg-muted`
- `text-gray-800` → `text-foreground`
- `text-gray-700/600` → `text-muted-foreground`
- `border-gray-*` → `border-border`
- Green badges: `bg-green-50` → `bg-green-500/10 dark:bg-green-500/20`
- Red errors: `bg-red-50` → `bg-red-500/10 dark:bg-red-500/20`