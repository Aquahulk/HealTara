lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Total lines: {len(lines)}")
for i in range(1820, 1835):
    print(f"{i+1}: {lines[i].rstrip()}")
