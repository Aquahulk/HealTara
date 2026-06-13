lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()
# Count div opens vs closes between lines 1682 and 1832 (space-y-4 section)
depth = 0
for i in range(1681, 1832):
    l = lines[i]
    opens = l.count('<div') - l.count('</div') 
    # Account for self-closing like <div />
    self_closing = l.count('<div ') and l.rstrip().endswith('/>')
    depth += opens
    if opens != 0 or (i > 1808 and i < 1832):
        print(f"{i+1} (depth={depth}): {lines[i].rstrip()[:100]}")
print(f"\nFinal depth: {depth} (should be -1 to close space-y-4 that was opened before line 1682)")
