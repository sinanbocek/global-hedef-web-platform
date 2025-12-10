import sys

# Read file
with open('components/Settings.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add products tab to navigation
content = content.replace(
    "{ id: 'banks', label: 'Banka Hesapları', icon: Landmark },",
    "{ id: 'products', label: 'Ürün Yönetimi', icon: Database },\n                { id: 'banks', label: 'Banka Hesapları', icon: Landmark },"
)

# Add import for ProductManagement
if 'ProductManagement' not in content:
    content = content.replace(
        "import { PartnershipSettings } from './PartnershipSettings';",
        "import { PartnershipSettings } from './PartnershipSettings';\nimport { ProductManagement } from './ProductManagement';"
    )

# Add products tab content before brand tab
content = content.replace(
    "{/* --- TAB: BRAND & MANAGEMENT --- */}",
    """{/* --- TAB: PRODUCTS --- */}
            {activeTab === 'products' && <ProductManagement />}

            {/* --- TAB: BRAND & MANAGEMENT --- */}"""
)

# Write back
with open('components/Settings.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Settings.tsx updated successfully!")
