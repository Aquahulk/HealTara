lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Total: {len(lines)} lines")
print("--- Lines 1810-1832 ---")
for i in range(1809, 1832):
    print(f"{i+1}: {lines[i].rstrip()}")
