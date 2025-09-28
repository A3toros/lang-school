# Schedule Hint Improvements - Simple Fix Plan

## Current Issues
1. **Basic filtering** - only exact prefix match
2. **Poor positioning** - can be cut off by table
3. **No keyboard support** - only mouse clicks
4. **Inconsistent tooltips** - mix of title attributes and custom hints
5. **Fixed timeout** - always 5 seconds regardless of confidence

## Simple Fixes (Priority Order)

### 1. Better Filtering (Quick Win)
```javascript
// Replace simple startsWith with smart matching
const filtered = availableStudents
  .map(student => ({
    ...student,
    score: getMatchScore(student.name, input)
  }))
  .filter(s => s.score > 0)
  .sort((a, b) => b.score - a.score)

const getMatchScore = (name, input) => {
  const n = name.toLowerCase()
  const i = input.toLowerCase()
  if (n.startsWith(i)) return 100
  if (n.includes(i)) return 50
  return 0
}

// Change autofill threshold from 3 to 7 matches
if (filtered.length <= 7 && filtered.length > 0 && input.trim().length > 0) {
```



### 3. Add Keyboard Support (Simple)
```jsx
// Add basic keyboard handling
onKeyDown={(e) => {
  if (e.key === 'Enter') {
    // Accept suggestion
  }
  if (e.key === 'Escape') {
    // Dismiss suggestion
  }
}}
```

### 4. Smart Timeout (Quick)
```javascript
// Adaptive timeout based on match quality
const timeout = firstStudent.score >= 100 ? 8000 : 5000
```

### 5. Smooth Transitions (Easy)
```jsx
// Add Framer Motion animations to autofill hint
<motion.div 
  initial={{ opacity: 0, y: -5, scale: 0.95 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  exit={{ opacity: 0, y: -5, scale: 0.95 }}
  transition={{ duration: 0.15, ease: "easeOut" }}
  className="..."
>
```

### 6. Consistent Tooltips (Medium)
```jsx
// Create simple tooltip component
const Tooltip = ({ children, text }) => (
  <div title={text}>{children}</div>
)
```

## Implementation Time
- **Quick fixes (1-5)**: 2-3 hours
- **Tooltip consistency**: 1-2 hours
- **Total**: Half day max

## Files to Change
- `src/components/admin/ScheduleTable.jsx` (main changes)
- Maybe create `src/components/common/Tooltip.jsx` (optional)

## Testing
- Test with 10+ students
- Test keyboard navigation
- Test on mobile
- Test edge cases (very long names, special characters)
