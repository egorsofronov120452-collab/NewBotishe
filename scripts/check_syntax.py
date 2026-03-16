path = '/vercel/share/v0-project/scripts/long-polling.cjs'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    src = f.read()

lines = src.split('\n')
issues = []

# State machine
i = 0
brace = 0
paren = 0
bracket = 0
in_single = False
in_double = False
template_stack = []  # stack of brace depths when template started
expr_depth = 0       # ${...} nesting inside template
in_block_comment = False
lineno = 1

def get_lineno(pos, src):
    return src[:pos].count('\n') + 1

while i < len(src):
    c = src[i]

    # Track line number
    if c == '\n':
        lineno += 1
        i += 1
        continue

    # Block comment
    if in_block_comment:
        if src[i:i+2] == '*/':
            in_block_comment = False
            i += 2
        else:
            i += 1
        continue

    # Inside single-quoted string
    if in_single:
        if c == '\\':
            i += 2
        elif c == "'":
            in_single = False
            i += 1
        else:
            i += 1
        continue

    # Inside double-quoted string
    if in_double:
        if c == '\\':
            i += 2
        elif c == '"':
            in_double = False
            i += 1
        else:
            i += 1
        continue

    # Inside template literal (not in ${} expression)
    if template_stack and expr_depth == 0:
        if c == '\\':
            i += 2
            continue
        if src[i:i+2] == '${':
            expr_depth += 1
            i += 2
            continue
        if c == '`':
            template_stack.pop()
            i += 1
            continue
        i += 1
        continue

    # Inside ${} expression (or nested)
    if expr_depth > 0:
        if c == '{':
            brace += 1
            expr_depth += 1
            i += 1
            continue
        if c == '}':
            expr_depth -= 1
            if expr_depth == 0:
                i += 1
                continue
            brace -= 1
            i += 1
            continue
        if c == '`':
            template_stack.append(brace)
            i += 1
            continue
        # fall through to handle strings etc inside expression
        if c == "'":
            in_single = True
            i += 1
            continue
        if c == '"':
            in_double = True
            i += 1
            continue
        if src[i:i+2] == '//':
            # skip to end of line
            while i < len(src) and src[i] != '\n':
                i += 1
            continue
        if src[i:i+2] == '/*':
            in_block_comment = True
            i += 2
            continue
        i += 1
        continue

    # Normal code (not in any string/template/comment)

    # Line comment
    if src[i:i+2] == '//':
        while i < len(src) and src[i] != '\n':
            i += 1
        continue

    # Block comment start
    if src[i:i+2] == '/*':
        in_block_comment = True
        i += 2
        continue

    # String starts
    if c == "'":
        in_single = True
        i += 1
        continue
    if c == '"':
        in_double = True
        i += 1
        continue
    if c == '`':
        template_stack.append(brace)
        i += 1
        continue

    # Brackets
    if c == '{':
        brace += 1
    elif c == '}':
        brace -= 1
        if brace < 0:
            issues.append(f'Line {lineno}: extra closing brace (balance={brace})')
            brace = 0
    elif c == '(':
        paren += 1
    elif c == ')':
        paren -= 1
        if paren < 0:
            issues.append(f'Line {lineno}: extra closing paren (balance={paren})')
            paren = 0
    elif c == '[':
        bracket += 1
    elif c == ']':
        bracket -= 1
        if bracket < 0:
            issues.append(f'Line {lineno}: extra closing bracket (balance={bracket})')
            bracket = 0

    i += 1

print(f"Total lines: {len(lines)}")
print(f"Brace balance:    {brace}  (should be 0)")
print(f"Paren balance:    {paren}  (should be 0)")
print(f"Bracket balance:  {bracket}  (should be 0)")
print(f"Template depth:   {len(template_stack)}  (should be 0)")
print(f"In block comment: {in_block_comment}")
print(f"In single quote:  {in_single}")
print(f"In double quote:  {in_double}")
print()
if issues:
    print("ISSUES (first 30):")
    for issue in issues[:30]:
        print(" ", issue)
else:
    print("No extra closing brackets found.")
