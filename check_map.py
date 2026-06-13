lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
# Find the map() call that this ))} belongs to by scanning backwards from line 1827
target = 1826  # 0-indexed
# Count open JSX tags vs close tags in the range to find mismatch
import re
# Find the nearest .map( before line 1827
for i in range(target, -1, -1):
    if '.map(' in lines[i] or '.map((' in lines[i]:
        print(f"Found .map at line {i+1}: {lines[i].rstrip()[:120]}")
        break
# Print lines 1780-1828 with line numbers
print("\n--- Lines 1780-1828 ---")
for i in range(1779, 1828):
    print(f"{i+1}: {lines[i].rstrip()}")
