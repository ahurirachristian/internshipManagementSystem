# Icon-Only Sidebar Collapse (Desktop) — v2 (fix alignment regression)

## Bug in v1 implementation
The first pass accidentally removed the base `.sidebar-brand` CSS block and used oversized vertical padding for the collapsed brand, causing:
- Logo misalignment in both expanded and collapsed states
- Loss of the original design's flex container, gap, horizontal padding, and border

## Fixes

### 1. `frontend1/ims/src/components/DashboardLayout.js`
- Wrap **submenu** link labels too, for consistency:
  - `nav-submenu` items: `<i ...></i> <span className="nav-label-text">{link.label}</span>`

### 2. `frontend1/ims/src/riho.css`
- **Restore the base `.sidebar-brand` block** that was accidentally removed:
  ```css
  .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  ```
- **Fix collapsed brand alignment**:
  - `.dashboard-shell.sidebar-collapsed .sidebar-brand` → `justify-content: center; padding: 11px 0;`
  - (64px sidebar − 42px logo) / 2 = 11px padding vertically centers the logo exactly
- Keep existing collapsed rules for hiding text, centering nav icons, and `.main` margin-left.

### 3. Mobile (`<=900px`)
- Unchanged: `.sidebar { display: none; }` keeps full-hide behavior on small screens.
