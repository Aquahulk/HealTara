lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
print(f"Before: {len(lines)}")

# From the div count analysis:
# Line 1823 (0-indexed 1822): '</div>' with 24 spaces indent -> EXTRA (depth went to -1)
# Line 1831 (0-indexed 1830): '</div>' with 10 spaces indent -> EXTRA (depth went to -3)
# 
# After removing line 1823, line numbers shift by 1, so old 1831 becomes 1830

print("Lines to remove:")
print(f"  Line 1823: {repr(lines[1822].rstrip())}")
print(f"  Line 1831: {repr(lines[1830].rstrip())}")

# Remove line 1823 first (higher index so removing lower first doesn't shift)
# Actually remove higher index first to avoid shifting
del lines[1830]  # was line 1831
del lines[1822]  # was line 1823

with open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"After: {len(lines)}")
print("Removed 2 extra </div> tags")
