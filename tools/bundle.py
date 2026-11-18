"""Inline all scripts into dist/preview.html (single file, preview mode)."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
def inline(m):
    src = m.group(1)
    if src == 'firebase-config.js':
        return '<script>window.FIREBASE_CONFIG = {};</script>'
    return '<script>\n' + (root / src).read_text() + '\n</script>'
out = re.sub(r'<script src="([^"]+)"></script>', inline, html)
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'preview.html').write_text(out)
print('wrote dist/preview.html', len(out))
