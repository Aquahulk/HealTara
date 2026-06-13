content = open(r'e:\HealTara-main\apps\web\app\admin-secure-panel-7x9y2z-2024\page.tsx', encoding='utf-8').read()

# The broken section starts at the ternary inside expandedHospitalId
# Find the exact broken part and replace it with clean structure
OLD = '''                            ) : selectedHospitalDetails && selectedHospitalDetails.id === hospital.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">'''

NEW = '''                            ) : selectedHospitalDetails && selectedHospitalDetails.id === hospital.id ? (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">'''

if OLD in content:
    print("Found target")
else:
    print("NOT FOUND - checking variants")
    # Try to find what's actually there
    idx = content.find('selectedHospitalDetails.id === hospital.id ? (')
    print(repr(content[idx:idx+200]))
