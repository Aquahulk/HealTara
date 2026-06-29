# 🎨 Homepage Color Guide

All colors for the homepage. Click the file links to jump to the exact line.

---

## 1. HEADER (Top Navigation Bar)
**File:** `apps/web/components/Header.tsx` → Line 66

| Element | Color | Line |
|---------|-------|------|
| Header background | `bg-[#003a9f]` (solid dark blue) | [Header.tsx:66](apps/web/components/Header.tsx#L66) |
| Book Appointment btn | `from-emerald-500 to-teal-500` | [Header.tsx:95](apps/web/components/Header.tsx#L95) |

---

## 2. HERO CAROUSEL (Slides)
**File:** `apps/web/app/page.tsx` → Lines 152–156 (slide gradients), Line 173 (applied)

| Slide | Gradient | Line |
|-------|----------|------|
| Slide 1 | `from-blue-600 via-purple-600 to-pink-500` | [page.tsx:152](apps/web/app/page.tsx#L152) |
| Slide 2 | `from-green-500 via-teal-500 to-blue-500` | [page.tsx:153](apps/web/app/page.tsx#L153) |
| Slide 3 | `from-purple-600 via-pink-500 to-red-500` | [page.tsx:154](apps/web/app/page.tsx#L154) |
| Slide 4 | `from-orange-500 via-red-500 to-pink-600` | [page.tsx:155](apps/web/app/page.tsx#L155) |
| Slide 5 | `from-indigo-600 via-purple-500 to-pink-500` | [page.tsx:156](apps/web/app/page.tsx#L156) |
| Applied via | `bg-gradient-to-br ${slides[currentSlide].gradient}` | [page.tsx:173](apps/web/app/page.tsx#L173) |

---

## 3. HERO SECTION WRAPPER
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gray-50` | [page.tsx:718](apps/web/app/page.tsx#L718) |

---

## 4. SEARCH CARD
| Element | Color | Line |
|---------|-------|------|
| Card | `bg-white border-gray-100` | [page.tsx:740](apps/web/app/page.tsx#L740) |
| "Find a Doctor" button | `from-blue-600 to-purple-600` | [page.tsx:816](apps/web/app/page.tsx#L816) |

---

## 5. FIXED MAP PANEL (Desktop right)
| Element | Color | Line |
|---------|-------|------|
| Panel background | `bg-white/95 backdrop-blur-md border-gray-100` | [page.tsx:865](apps/web/app/page.tsx#L865) |
| Panel header | `bg-gradient-to-r from-emerald-50/80 to-blue-50/80` | [page.tsx:867](apps/web/app/page.tsx#L867) |
| Locate Me button | `from-emerald-600 to-teal-600` | [page.tsx:879](apps/web/app/page.tsx#L879) |
| Search button | `from-emerald-600 to-teal-600` | [page.tsx:916](apps/web/app/page.tsx#L916) |

---

## 6. MOBILE MAP SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-white to-slate-50` | [page.tsx:924](apps/web/app/page.tsx#L924) |
| Locate Me button | `from-emerald-600 to-teal-600` | [page.tsx:937](apps/web/app/page.tsx#L937) |

---

## 7. BROWSE HEALTHCARE — Category Buttons
| Element | Color | Line |
|---------|-------|------|
| Section heading area | `bg-white` (inside `pb-0 bg-white`) | [page.tsx:973](apps/web/app/page.tsx#L973) |
| Active "Hospitals" bg | `#5b4fcf` (solid purple) | [page.tsx:987](apps/web/app/page.tsx#L987) |
| Active "Doctors" bg | `#2a2a9e` (solid dark blue) | [page.tsx:989](apps/web/app/page.tsx#L989) |
| Active "Coming Soon" bg | `#d97706` (solid amber) | [page.tsx:990](apps/web/app/page.tsx#L990) |
| Inactive button | `bg-white border-gray-200` | [page.tsx:1002](apps/web/app/page.tsx#L1002) |

---

## 8. CARDS SECTION (Doctor/Hospital/Coming Soon cards)
| Element | Color | Line |
|---------|-------|------|
| **Doctors BG** | `linear-gradient(180deg, #2a2a9e 0%, #1e1e96 30%, #00c4e8 100%)` | [page.tsx:1019](apps/web/app/page.tsx#L1019) |
| **Hospitals BG** | `linear-gradient(180deg, #5b4fcf 0%, #764ba2 50%, #667eea 100%)` | [page.tsx:1019](apps/web/app/page.tsx#L1019) |
| **Coming Soon BG** | `linear-gradient(180deg, #d97706 0%, #b45309 100%)` | [page.tsx:1019](apps/web/app/page.tsx#L1019) |
| Doctor "Book Now" btn | `from-emerald-600 to-blue-600` | [page.tsx:1130](apps/web/app/page.tsx#L1130) |
| Hospital "Visit" btn | `from-blue-600 to-purple-600` | [page.tsx:1243](apps/web/app/page.tsx#L1243) |

The full gradient string is on **line 1019** in the `style={{ background: ... }}` attribute.

---

## 9. STATS SECTION ("Trusted by Thousands")
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50` | [page.tsx:1265](apps/web/app/page.tsx#L1265) |
| Stat icon boxes | `from-blue-500 to-purple-600` | [page.tsx:1280](apps/web/app/page.tsx#L1280) |
| Trust badge 1 | `from-blue-500 to-blue-600` | [page.tsx:1292](apps/web/app/page.tsx#L1292) |
| Trust badge 2 | `from-yellow-500 to-orange-500` | [page.tsx:1293](apps/web/app/page.tsx#L1293) |
| Trust badge 3 | `from-green-500 to-emerald-600` | [page.tsx:1294](apps/web/app/page.tsx#L1294) |

---

## 10. HOW IT WORKS SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-blue-900 to-blue-800` | [page.tsx:1310](apps/web/app/page.tsx#L1310) |
| Step number circle | `from-blue-600 to-purple-600` | [page.tsx:1321](apps/web/app/page.tsx#L1321) |
| Step icon box | `from-blue-500 to-purple-600` | [page.tsx:1326](apps/web/app/page.tsx#L1326) |

---

## 11. WHY CHOOSE US SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50` | [page.tsx:1345](apps/web/app/page.tsx#L1345) |
| Feature icon box | `from-blue-600 to-purple-600` | [page.tsx:1357](apps/web/app/page.tsx#L1357) |

---

## 12. TESTIMONIALS SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-blue-900 to-indigo-900` | [page.tsx:1371](apps/web/app/page.tsx#L1371) |
| Testimonial card | `from-blue-50 via-purple-50 to-pink-50` | [page.tsx:1378](apps/web/app/page.tsx#L1378) |
| Role text | `text-purple-600` | [page.tsx:1390](apps/web/app/page.tsx#L1390) |

---

## 13. HEALTH TIPS SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-blue-900 to-indigo-900` | [page.tsx:1403](apps/web/app/page.tsx#L1403) |
| Category badge | `bg-blue-100 text-blue-700` | [page.tsx:1418](apps/web/app/page.tsx#L1418) |
| Read More button | `from-blue-600 to-indigo-600` | [page.tsx:1427](apps/web/app/page.tsx#L1427) |

---

## 14. CTA BANNERS SECTION
| Element | Color | Line |
|---------|-------|------|
| Section background | `bg-gradient-to-br from-blue-600 to-indigo-700` | [page.tsx:1439](apps/web/app/page.tsx#L1439) |
| Doctor register btn | `from-blue-600 to-indigo-600` | [page.tsx:1449](apps/web/app/page.tsx#L1449) |
| Patient register btn | `from-emerald-600 to-teal-600` | [page.tsx:1463](apps/web/app/page.tsx#L1463) |

---

## 15. FOOTER
| Element | Color | Line |
|---------|-------|------|
| Footer background | `bg-gray-900` | [page.tsx:1494](apps/web/app/page.tsx#L1494) |

---

## 🎯 Quick Summary of Section Backgrounds

| # | Section | Background | Line |
|---|---------|-----------|------|
| 1 | Header | `#003a9f` solid | Header.tsx:66 |
| 2 | Hero | Rotating gradients (5 slides) | page.tsx:152-156 |
| 3 | Map Panel | `white/95` frosted glass | page.tsx:865 |
| 4 | Mobile Map | `white → slate-50` | page.tsx:924 |
| 5 | Browse Tabs | `white` | page.tsx:973 |
| 6 | Cards (Hospitals) | `#5b4fcf → #764ba2 → #667eea` | page.tsx:1019 |
| 7 | Cards (Doctors) | `#2a2a9e → #1e1e96 → #00c4e8` | page.tsx:1019 |
| 8 | Cards (Soon) | `#d97706 → #b45309` | page.tsx:1019 |
| 9 | Stats | `blue-50 → purple-50 → pink-50` | page.tsx:1265 |
| 10 | How It Works | `blue-900 → blue-800` (dark) | page.tsx:1310 |
| 11 | Why Choose Us | `purple-50 → pink-50 → blue-50` | page.tsx:1345 |
| 12 | Testimonials | `blue-900 → indigo-900` (dark) | page.tsx:1371 |
| 13 | Health Tips | `blue-900 → indigo-900` (dark) | page.tsx:1403 |
| 14 | CTA Banners | `blue-600 → indigo-700` (medium) | page.tsx:1439 |
| 15 | Footer | `gray-900` (near black) | page.tsx:1494 |

---

## 💡 Tips

- Line numbers may shift slightly after edits. Use `Ctrl+G` in VS Code to jump to a line.
- Gradients use `bg-gradient-to-br` (bottom-right) or `linear-gradient(180deg, ...)` (top-to-bottom).
- Tailwind colors: `50` = lightest, `900` = darkest. e.g., `blue-50` is almost white, `blue-900` is almost black.
- Hex colors used for the cards section because they need to exactly match the category button colors.


---
---

# 🎨 Find Doctors Page Color Guide
**File:** `apps/web/app/doctors/page.tsx`

---

| Element | Color | Line |
|---------|-------|------|
| **Page background** | `bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20` | [doctors/page.tsx:161](apps/web/app/doctors/page.tsx#L161) |
| Loading spinner | `border-blue-600` | [doctors/page.tsx:21](apps/web/app/doctors/page.tsx#L21) |
| Page title | `text-gray-900` | [doctors/page.tsx:167](apps/web/app/doctors/page.tsx#L167) |
| Subtitle | `text-gray-600` | [doctors/page.tsx:168](apps/web/app/doctors/page.tsx#L168) |
| Doctor cards | See `DoctorOyoCard` component → `apps/web/components/DoctorOyoCard.tsx` | — |
| MapSidebar (right) | See MapSidebar section below | — |

### DoctorOyoCard Colors
**File:** `apps/web/components/DoctorOyoCard.tsx`

Check that file for:
- Card background (usually `bg-white`)
- Book button gradient
- Badge/chip colors
- Specialization badge

---
---

# 🎨 Find Hospitals Page Color Guide
**File:** `apps/web/app/hospitals/page.tsx`

---

| Element | Color | Line |
|---------|-------|------|
| **Page background** | `bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/20` | [hospitals/page.tsx:118](apps/web/app/hospitals/page.tsx#L118) |
| Loading spinner | `border-blue-600` | [hospitals/page.tsx:23](apps/web/app/hospitals/page.tsx#L23) |
| Mobile Map toggle btn | `bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 text-indigo-700` | [hospitals/page.tsx:143](apps/web/app/hospitals/page.tsx#L143) |
| Map pin count badge | `bg-indigo-100 text-indigo-600` | [hospitals/page.tsx:147](apps/web/app/hospitals/page.tsx#L147) |
| Hospital cards | `bg-white border-gray-200` | [hospitals/page.tsx:233](apps/web/app/hospitals/page.tsx#L233) |
| Hospital logo area | `bg-gray-100` | [hospitals/page.tsx:238](apps/web/app/hospitals/page.tsx#L238) |
| Dept badge | `text-blue-500` (Building2 icon) | [hospitals/page.tsx:250](apps/web/app/hospitals/page.tsx#L250) |
| Doctors badge | `text-green-500` (Users icon) | [hospitals/page.tsx:254](apps/web/app/hospitals/page.tsx#L254) |
| Visit Website btn | `bg-gray-100 hover:bg-gray-200 text-gray-900` | [hospitals/page.tsx:267](apps/web/app/hospitals/page.tsx#L267) |
| Empty state card | `bg-white` | [hospitals/page.tsx:306](apps/web/app/hospitals/page.tsx#L306) |
| Clear Search btn | `bg-blue-600 hover:bg-blue-700` | [hospitals/page.tsx:315](apps/web/app/hospitals/page.tsx#L315) |

---

## 🎯 Page Backgrounds Summary

| Page | Background | Vibe |
|------|-----------|------|
| Homepage | `bg-white` (main), sections have their own gradients | Clean white with colorful sections |
| Find Doctors | `from-slate-50 via-blue-50/30 to-indigo-50/20` | Subtle cool blue tint |
| Find Hospitals | `from-slate-50 via-purple-50/30 to-blue-50/20` | Subtle warm purple-blue tint |
| Dashboard | Check `apps/web/app/dashboard/page.tsx` | — |
| Login | Check `apps/web/app/login/page.tsx` | — |

---

## MapSidebar Colors
**File:** `apps/web/components/MapSidebar.tsx`

| Element | Color | Line |
|---------|-------|------|
| Panel background | `bg-white border-gray-200` | [MapSidebar.tsx:142](apps/web/components/MapSidebar.tsx#L142) |
| Header bar | `bg-gray-50 border-gray-100` | [MapSidebar.tsx:145](apps/web/components/MapSidebar.tsx#L145) |
| Pin count badge | `bg-blue-100 text-blue-700` | [MapSidebar.tsx:149](apps/web/components/MapSidebar.tsx#L149) |
| User location dot | `background:#3b82f6` (blue-500) | [MapSidebar.tsx:112](apps/web/components/MapSidebar.tsx#L112) |
| "Get Directions" btn | `bg-blue-600 hover:bg-blue-700` | [MapSidebar.tsx:199](apps/web/components/MapSidebar.tsx#L199) |
| Info card | `bg-white border-gray-200` | [MapSidebar.tsx:189](apps/web/components/MapSidebar.tsx#L189) |


---
---

# 🎨 Desktop Sidebar Color Guide
**File:** `apps/web/components/DesktopSidebar.tsx`

---

## Main Container
| Element | Color | Line |
|---------|-------|------|
| **Sidebar background** | `bg-gradient-to-b from-blue-600 to-blue-800` | [DesktopSidebar.tsx:149](apps/web/components/DesktopSidebar.tsx#L149) |
| Right border | `border-blue-900` | [DesktopSidebar.tsx:149](apps/web/components/DesktopSidebar.tsx#L149) |
| Shadow | `shadow-lg` | [DesktopSidebar.tsx:149](apps/web/components/DesktopSidebar.tsx#L149) |

## Header (top of sidebar)
| Element | Color | Line |
|---------|-------|------|
| Bottom border | `border-blue-700` | [DesktopSidebar.tsx:155](apps/web/components/DesktopSidebar.tsx#L155) |
| "Navigation" text | `text-white` | [DesktopSidebar.tsx:157](apps/web/components/DesktopSidebar.tsx#L157) |
| Collapse button hover | `hover:bg-blue-700` | [DesktopSidebar.tsx:160](apps/web/components/DesktopSidebar.tsx#L160) |
| Collapse icon | `text-white` | [DesktopSidebar.tsx:163](apps/web/components/DesktopSidebar.tsx#L163) |

## Navigation Items
| Element | Color | Line |
|---------|-------|------|
| **Active item background** | `bg-white text-blue-600 shadow-md` | [DesktopSidebar.tsx:181](apps/web/components/DesktopSidebar.tsx#L181) |
| **Inactive item text** | `text-blue-100 hover:bg-blue-700` | [DesktopSidebar.tsx:182](apps/web/components/DesktopSidebar.tsx#L182) |
| Active icon | `text-blue-600` | [DesktopSidebar.tsx:189](apps/web/components/DesktopSidebar.tsx#L189) |
| Inactive icon | `text-blue-200` | [DesktopSidebar.tsx:189](apps/web/components/DesktopSidebar.tsx#L189) |
| Active label text | `text-blue-600` | [DesktopSidebar.tsx:193](apps/web/components/DesktopSidebar.tsx#L193) |
| Inactive label text | `text-white` | [DesktopSidebar.tsx:193](apps/web/components/DesktopSidebar.tsx#L193) |
| Active description | `text-blue-500` | [DesktopSidebar.tsx:197](apps/web/components/DesktopSidebar.tsx#L197) |
| Inactive description | `text-blue-200` | [DesktopSidebar.tsx:197](apps/web/components/DesktopSidebar.tsx#L197) |

## Footer (bottom of sidebar)
| Element | Color | Line |
|---------|-------|------|
| Footer border | `border-blue-700` | [DesktopSidebar.tsx:207](apps/web/components/DesktopSidebar.tsx#L207) |
| Tip card background | `bg-blue-700 border-blue-600` | [DesktopSidebar.tsx:208](apps/web/components/DesktopSidebar.tsx#L208) |
| Tip icon | `text-blue-200` | [DesktopSidebar.tsx:210](apps/web/components/DesktopSidebar.tsx#L210) |
| Tip title | `text-white` | [DesktopSidebar.tsx:212](apps/web/components/DesktopSidebar.tsx#L212) |
| Tip body text | `text-blue-100` | [DesktopSidebar.tsx:214](apps/web/components/DesktopSidebar.tsx#L214) |
| Logout button | `text-blue-100 hover:bg-blue-700` | [DesktopSidebar.tsx:222](apps/web/components/DesktopSidebar.tsx#L222) |

---

## 🎯 Sidebar Color Palette

| Role | Color Scheme |
|------|-------------|
| Gradient | `blue-600` (top) → `blue-800` (bottom) |
| Active state | White background + `blue-600` text/icon |
| Inactive state | Transparent + `blue-100`/`white` text |
| Hover | `blue-700` background |
| Borders | `blue-700` (dividers), `blue-900` (outer) |

To change the sidebar to a different color scheme, edit **line 149** for the main gradient and update `blue-600`/`blue-700`/`blue-800` throughout the component to your preferred color family (e.g., `indigo-600`, `purple-600`, `emerald-600`).
