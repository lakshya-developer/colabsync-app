# CollabSync — Project Agent Rules

## Brand Color System

The CollabSync logo uses two brand colors. These MUST be used as small, minimal accent
elements throughout the application — now and in every future component or page.

### Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `brand-blue` | `#2E7DC5` | Primary accent — "Collab" side of brand |
| `brand-blue-light` | `#5BA3E0` | Lighter tint for hover states / subtle fills |
| `brand-blue-dark` | `#1A5C9A` | Darker shade for pressed states |
| `brand-green` | `#4ABF6A` | Secondary accent — "Sync" side of brand |
| `brand-green-light` | `#72D48B` | Lighter tint for hover states / subtle fills |
| `brand-green-dark` | `#2E9B4E` | Darker shade for pressed states |

These are registered as **Tailwind v4 `@theme` tokens** in `src/app/globals.css`:
```css
@theme {
  --color-brand-blue:        #2E7DC5;
  --color-brand-blue-light:  #5BA3E0;
  --color-brand-blue-dark:   #1A5C9A;
  --color-brand-green:       #4ABF6A;
  --color-brand-green-light: #72D48B;
  --color-brand-green-dark:  #2E9B4E;
}
```
This generates utility classes: `text-brand-blue`, `bg-brand-green`, `border-brand-blue`, etc.

> **Note**: This project uses **Tailwind v4**. Do NOT add colors to `tailwind.config.ts` — they must go in `@theme` inside `globals.css`.

### When to apply

Use brand colors as **small, minimal accent elements** — never as dominant background fills.
Good places to add them:

- Status indicator dots / ping animations
- Icon background tints (`bg-brand-blue/10`, `bg-brand-green/10`)
- Icon stroke/fill colors
- Active nav link color
- Hover text color transitions on links/buttons
- Progress bar fills (blue to green gradient)
- Numbered step badges / avatar-like circles
- Section label / eyebrow text accents (`text-brand-blue`, `text-brand-green`)
- Keyword highlights inside headings
- Divider dots or decorative separators
- Badge borders or left-border accent strips
- Focus ring color on inputs (`ring-brand-blue`)
- Checkbox / radio checked state
- Selected tab underline

### What NOT to do

- Do NOT use brand colors as full page or section backgrounds
- Do NOT use brand colors as the primary button background (keep those zinc/neutral)
- Do NOT override the light/dark theme background or border structure
- Do NOT use both colors on the same element (keep them alternating or contextual)
- Do NOT introduce new accent colors — always use brand-blue or brand-green

### Pattern convention

When both colors appear together (e.g., a two-dot badge prefix, a gradient, step numbers),
always put **blue first** then **green second** — matching the logo reading order ("Collab" then "Sync").

### Example snippets

```tsx
{/* Two-dot brand badge */}
<span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-blue" />
<span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-green" />

{/* Blue to Green gradient bar */}
<div style={{ background: 'linear-gradient(90deg, #2E7DC5, #4ABF6A)' }} />

{/* Icon tint container */}
<div className="rounded-xl bg-brand-blue/10 p-2 text-brand-blue">
  <SomeIcon className="h-5 w-5" />
</div>

{/* Alternating step circles */}
<div style={{ background: index % 2 === 0 ? '#2E7DC5' : '#4ABF6A' }}>
  {index + 1}
</div>

{/* Eyebrow / label text */}
<p>
  <span className="text-brand-blue">Ready</span> to{' '}
  <span className="text-brand-green">work faster?</span>
</p>
```
