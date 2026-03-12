"""Truncate map-editor.html to keep only first 1209 lines (the valid HTML)."""
import os

src = os.path.join(os.path.dirname(__file__), '..', 'tools', 'map-editor.html')
src = os.path.abspath(src)

with open(src, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep only lines 0-1208 (first 1209 lines, index 0-based)
clean = lines[:1209]

with open(src, 'w', encoding='utf-8') as f:
    f.writelines(clean)

print(f"Done. Kept {len(clean)} lines. File is now {os.path.getsize(src)} bytes.")
print(f"Last line: {clean[-1].rstrip()}")
