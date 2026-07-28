import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The old snippet to be replaced
    old_snippet = 'className="inline-flex items-center justify-center font-bold tracking-widest text-current"'
    new_snippet = 'className="inline-flex items-center justify-center font-bold tracking-widest text-2xl text-[#E50914]"'

    new_content = content.replace(old_snippet, new_snippet)

    # In case there are instances where text-4xl was already applied
    old_snippet_4xl = 'className="inline-flex items-center justify-center font-bold tracking-widest text-4xl text-[#E50914]"'
    # Actually, I changed LoadingSpinner.tsx manually to 4xl. Let's leave LoadingSpinner.tsx alone, or change it to 2xl? Let's keep it 4xl as it's the main loading component, but let's change all others to 2xl.
    # So the above simple string replace is enough.

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated text size and color in {filepath}')

for root, dirs, files in os.walk('d:\\streamit'):
    if 'node_modules' in root or '.next' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            # Skip LoadingSpinner.tsx to keep its 4xl text
            if file == 'LoadingSpinner.tsx':
                continue
            process_file(os.path.join(root, file))
