content = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').read()
lines = content.split('\n')

# Line 1734 (0-indexed: 1733) is the extra </div> that prematurely closes space-y-4
# We need to remove it so that lines 1735+ (doctors panel etc) are inside space-y-4
# Also fix the "Doctors i in" typo on line 1737 (0-indexed: 1736)

print(f"Line 1733: {repr(lines[1732])}")
print(f"Line 1734: {repr(lines[1733])}")
print(f"Line 1735: {repr(lines[1734])}")
print(f"Line 1737: {repr(lines[1736])}")
