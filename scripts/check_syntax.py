import re

path = '/vercel/share/v0-project/scripts/long-polling.cjs'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

braces = 0
parens = 0
brackets = 0
in_single = False
in_double = False
in_template = 0  # depth counter for template literals
in_block_comment = False
issues = []

for lineno, line in enumerate(lines, 1):
    i = 0
    while i < len(line):
        c = line[i]

        # Block comment
        if in_block_comment:
            if c == '*' and i+1 < len(line) and line[i+1] == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue

        # Single-line comment (only outside strings)
        if not in_single and not in_double and in_template == 0:
            if c == '/' and i+1 < len(line) and line[i+1] == '/':
                break  # rest of line is comment
            if c == '/' and i+1 < len(line) and line[i+1] == '*':
                in_block_comment = True
                i += 2
                continue

        # Escape sequences inside strings
        if c == '\\' and (in_single or in_double or in_template > 0):
            i += 2
            continue

        # Single-quoted string
        if c == "'" and not in_double and in_template == 0:
            in_single = not in_single
            i += 1
            continue
        if in_single:
            i += 1
            continue

        # Double-quoted string
        if c == '"' and not in_single and in_template == 0:
            in_double = not in_double
            i += 1
            continue
        if in_double:
            i += 1
            continue

        # Template literal
        if c == '`':
            if in_template > 0:
                in_template -= 1
            else:
                in_template += 1
            if in_template > 1:
                issues.append(f'Line {lineno}: nested template literal depth={in_template}')
            i += 1
            continue
        if in_template > 0 and c != '$':
            i += 1
            continue

        # Braces/parens/brackets (outside strings)
        if c == '{': braces += 1
        elif c == '}': braces -= 1
        elif c == '(': parens += 1
        elif c == ')': parens -= 1
        elif c == '[': brackets += 1
        elif c == ']': brackets -= 1

        if braces < 0:
            issues.append(f'Line {lineno}: braces went negative ({braces})')
            braces = 0
        if parens < 0:
            issues.append(f'Line {lineno}: parens went negative ({parens})')
            parens = 0

        i += 1

print(f"Total lines: {len(lines)}")
print(f"Final brace balance:   {braces}  (should be 0)")
print(f"Final paren balance:   {parens}  (should be 0)")
print(f"Final bracket balance: {brackets}  (should be 0)")
print(f"Template literal depth: {in_template}  (should be 0)")
print(f"In block comment: {in_block_comment}")
print()
if issues:
    print("ISSUES FOUND:")
    for issue in issues[:30]:
        print(" ", issue)
else:
    print("No structural issues found.")
