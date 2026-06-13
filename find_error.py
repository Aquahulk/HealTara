lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Total: {len(lines)}")
# Find lines with .map( that return JSX but might be missing closing
for i, l in enumerate(lines[1780:1840], start=1781):
    print(f"{i}: {l.rstrip()}")
