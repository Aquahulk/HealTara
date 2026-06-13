lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Before: {len(lines)}")

# Print lines 1820-1835 to confirm what to remove
print("--- Lines 1820-1835 ---")
for i in range(1819, 1835):
    print(f"{i+1}: {repr(lines[i].rstrip())}")

# Lines to check:
# 1822 (0-indexed 1821): '                          )}'   <- closes expandedHospitalId &&
# 1823 (0-indexed 1822): '                        </div>'  <- EXTRA - remove this
# 1824 (0-indexed 1823): '                      )}'  <- closes expandedHospitalId ternary? NO this is extra

# After removing the extra </div> at 1823, we need to recount
