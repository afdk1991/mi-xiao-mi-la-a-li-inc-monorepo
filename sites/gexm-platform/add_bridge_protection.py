import re

with open('f:/gexm/wp-content/themes/mixm-laal/inc/plugin-bridge.php', 'r', encoding='utf-8') as f:
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
        
        if func_name.startswith('mixm_laal_'):
            new_lines.append(f'{indent}if (!function_exists(\'{func_name}\')) {{')
            
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

with open('f:/gexm/wp-content/themes/mixm-laal/inc/plugin-bridge.php', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('Done!')
