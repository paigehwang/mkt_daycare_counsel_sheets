"""
Build the dashboard HTML by injecting data.json into template.html.

Run AFTER parse.py and validate.py.
"""
import os
import shutil

DATA_JSON = '/home/claude/dashboard/data.json'
TEMPLATE = None  # set by skill — points to template.html in skill folder
OUTPUT = '/mnt/user-data/outputs/케어링_상담_대시보드.html'

def build(template_path):
    with open(template_path, 'r', encoding='utf-8') as f:
        template = f.read()
    with open(DATA_JSON, 'r', encoding='utf-8') as f:
        data = f.read()
    html = template.replace('__DATA_JSON_PLACEHOLDER__', data)
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"✅ Built: {OUTPUT}")
    print(f"   Size: {os.path.getsize(OUTPUT):,} bytes")

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: python build.py <path/to/template.html>")
        sys.exit(1)
    build(sys.argv[1])
