# AI Agent Brand & Design System Guidelines

> **CRITICAL RULE FOR ALL AI AGENTS:**
> Whatever feature, UI component, page, or style you build or modify in this project, it **MUST STRICTLY ALIGN** with the project's brand identity, typography, and color palette.
> **DO NOT USE BLUE COLORS (`#0284c7`, `#3b82f6`, `#2563eb`, `#1d4ed8`, `#e0f2fe`, `#eff6ff`, or standard WordPress/Tailwind blues) ANYWHERE IN THE UI.**

---

## 1. Brand Identity & Primary Color Palette

| Token / Role | Hex / Value | Description |
|---|---|---|
| **Primary Brand Green** | `#075603` | Main brand color for primary buttons, active tabs, highlights, headers, and focus borders. |
| **Primary Dark / Hover** | `#053b02` | Used for button hover states, active menu borders, and dark accents. |
| **Primary Light / Badge BG** | `#eaf5e9` | Background for active tabs, selected badges, chips, count tags, and soft highlights. |
| **Accent Green** | `#068200` | Vibrant accent green for glows, checkmarks, and active indicators. |
| **Accent Glow** | `rgba(6, 130, 0, 0.15)` | Subtle focus rings and elevated box-shadow glows. |
| **Sidebar Background** | `#0d1512` | Dark forest-slate sidebar theme. |
| **Sidebar Hover** | `#16241f` | Dark hover state for sidebar links. |
| **Card / Canvas BG** | `#ffffff` / `#f8fafc` | Clean, modern white cards and off-white background surfaces. |
| **Text Main** | `#0f172a` | Deep slate for primary headings and body text. |
| **Text Muted** | `#64748b` | Medium slate for secondary captions, subtitles, and timestamps. |
| **Border Subtle** | `#e2e8f0` / `#cbd5e1` | Crisp, clean borders. |

---

## 2. Strict Design Rules

1. **NO Generic Blue**: Never introduce WordPress default blues (`#2271b1`), Tailwind blues (`#3b82f6`, `#2563eb`), or light blues (`#e0f2fe`, `#f0f9ff`) in buttons, links, active badges, or checkboxes. Always replace them with the `#075603` / `#eaf5e9` green palette.
2. **Typography**: Always use the project's authentic Bengali font hierarchy:
   ```css
   font-family: 'Kalpurush', 'payasti_uni', 'Hind Siliguri', sans-serif;
   ```
3. **Form Controls & Focus States**:
   - Checkboxes: `accent-color: #075603;`
   - Active / Focus inputs: `border-color: #075603; box-shadow: 0 0 0 2px rgba(7, 86, 3, 0.15);`
   - Active Tab / Pill: `color: #075603; background: #eaf5e9; font-weight: 700;`
   - Count Badges: `color: #075603; background: #eaf5e9; font-weight: 600;`
4. **Primary Action Buttons**:
   ```css
   background: #075603;
   color: #ffffff;
   border-radius: 6px;
   transition: all 0.2s ease;
   ```
   Hover state:
   ```css
   background: #053b02;
   ```
5. **Consistency Across Views**: Ensure any new admin views, frontend pages, or modal components strictly respect these tokens defined in [`public/css/admin.css`](file:///c:/Users/atiqu/Herd/sera10/public/css/admin.css) and [`public/css/wp-gutenberg-editor.css`](file:///c:/Users/atiqu/Herd/sera10/public/css/wp-gutenberg-editor.css).
