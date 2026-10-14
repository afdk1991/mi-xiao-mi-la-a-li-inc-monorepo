import os
import re

def add_function_exists_protection(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    lines = content.split('\n')
    new_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        func_match = re.match(r'^\s*(function\s+([a-zA-Z_][a-zA-Z0-9_]*))\s*\(', line)
        if func_match:
            func_name = func_match.group(2)
            indent = line[:len(line) - len(line.lstrip())]
            
            if func_name.startswith('mixm_core_'):
                new_lines.append(f'{indent}if (!function_exists(\'{func_name}\')) {{')
                new_lines.append(line)
                
                brace_count = 0
                j = i
                while j < len(lines):
                    brace_count += lines[j].count('{') - lines[j].count('}')
                    new_lines.append(lines[j])
                    if brace_count == 0:
                        break
                    j += 1
                
                new_lines.append(f'{indent}}}')
                i = j + 1
                continue
        
        class_match = re.match(r'^\s*(class\s+([a-zA-Z_][a-zA-Z0-9_]*))', line)
        if class_match:
            class_name = class_match.group(2)
            indent = line[:len(line) - len(line.lstrip())]
            
            if class_name.startswith('MixM_'):
                new_lines.append(f'{indent}if (!class_exists(\'{class_name}\')) {{')
                new_lines.append(line)
                
                brace_count = 0
                j = i
                while j < len(lines):
                    brace_count += lines[j].count('{') - lines[j].count('}')
                    new_lines.append(lines[j])
                    if brace_count == 0:
                        break
                    j += 1
                
                new_lines.append(f'{indent}}}')
                i = j + 1
                continue
        
        new_lines.append(line)
        i += 1
    
    new_content = '\n'.join(new_lines)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Updated: {file_path}')
    else:
        print(f'No changes: {file_path}')

files = [
    'f:/gexm/wp-content/plugins/mixm-core/mixm-core.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/functions.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/class-cache-helper.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/class-service-container.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/class-base-controller.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/repositories/class-order-repository.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/services/class-order-service.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/api/permissions.php',
    'f:/gexm/wp-content/plugins/mixm-core/includes/shortcodes.php',
]

for file in files:
    if os.path.exists(file):
        add_function_exists_protection(file)
    else:
        print(f'File not found: {file}')

print('Done!')
