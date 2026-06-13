lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Before: {len(lines)} lines")

# Remove line 1734 (0-indexed: 1733) — the premature </div> closing space-y-4
del lines[1733]

# Write back
with open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"After: {len(lines)} lines")
print("Done — removed premature </div> that was closing space-y-4 too early")
