lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Total: {len(lines)}")

# Lines around 1730-1736 (0-indexed 1729-1735)
print("--- Lines 1729-1738 ---")
for i in range(1728, 1738):
    print(f"{i+1}: {repr(lines[i].rstrip())}")
