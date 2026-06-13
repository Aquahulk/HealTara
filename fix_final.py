lines = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').readlines()

# The diagnostics say:
# - <ul> at line 1631 has no closing tag
# - Errors cascade from line 1820 onwards
# 
# Lines 1812-1827 structure:
# 1811: })}   <- closes feature flags .map
# 1812: </div>  <- closes grid
# 1813: </div>  <- closes feature flags panel  
# 1814: (empty)
# 1815: </div>  <- should close space-y-4
# 1816: ) : (
# 1817: <div> no hospital
# ...
# 1821: )}
# 1822: </div>  <- closes expandedHospitalId panel
# 1823: )}
# 1824: (empty)
# 1825: </li>
# 1826: ))}   <- closes adminHospitals.map
# 1827: </ul>  <- WAIT this is actually </ul> not a problem
# 
# The actual issue: the space-y-4 div needs to be closed BEFORE the ) : ( ternary
# AND the doctors list <ul> at line 1739 needs its </ul> 
# Let me check what's at line 1769 (should be </ul>)

print("--- Lines 1765-1775 ---")
for i in range(1764, 1775):
    print(f"{i+1}: {repr(lines[i].rstrip())}")

print("\n--- Lines 1813-1828 ---")
for i in range(1812, 1828):
    print(f"{i+1}: {repr(lines[i].rstrip())}")
