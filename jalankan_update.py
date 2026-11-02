# Script Otomatis Pembaruan Proyek Arisan Adnan
# Menambahkan Panel Supabase Table Viewer & Editor ke index.html dan js/app.js

import os
import re

print("==================================================")
print("  MEMULAI PEMBARUAN OTOMATIS: TAB 5 PENGATURAN   ")
print("==================================================")

# 1. Update index.html
html_path = 'index.html'
if os.path.exists(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()

    with open('snippet_index.html', 'r', encoding='utf-8') as f:
        html_snippet = f.read()

    if 'adminDbManagerCard' not in html:
        # Sisipkan tepat sebelum penutup tab pengaturan atau penutup </main>
        patterns = [
            r'(<div[^>]*id=["']tabPengaturan["'][^>]*>[\s\S]*?)(</div>\s*<!--\s*End Tab Pengaturan|\s*</section>|\s*</div>\s*</div>\s*</main>)',
            r'(</main>)',
            r'(</body>)'
        ]
        updated = False
        for p in patterns:
            m = re.search(p, html, re.IGNORECASE)
            if m:
                pos = m.start(1) if ('</main>' in p or '</body>' in p) else m.end(1)
                html = html[:pos] + "
" + html_snippet + "
" + html[pos:]
                updated = True
                break
        
        if updated:
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html)
            print("✓ Berhasil memperbarui index.html (Panel Dropdown & Modal Edit terpasang)")
        else:
            print("! Gagal menentukan posisi otomatis di index.html. Silakan tempel snippet_index.html secara manual.")
    else:
        print("✓ Panel adminDbManagerCard sudah ada di index.html (Lewati)")
else:
    print("! File index.html tidak ditemukan di direktori ini.")

# 2. Update js/app.js
js_path = os.path.join('js', 'app.js')
if not os.path.exists(js_path) and os.path.exists('app.js'):
    js_path = 'app.js'

if os.path.exists(js_path):
    with open(js_path, 'r', encoding='utf-8') as f:
        js = f.read()

    with open('snippet_app.js', 'r', encoding='utf-8') as f:
        js_snippet = f.read()

    if 'MODUL PENGATURAN: MANAJEMEN TABEL DATABASE SUPABASE' not in js:
        js = js + "

" + js_snippet
        with open(js_path, 'w', encoding='utf-8') as f:
            f.write(js)
        print(f"✓ Berhasil memperbarui {js_path} (Fungsi API Supabase terpasang)")
    else:
        print(f"✓ Fungsi Supabase Database Manager sudah ada di {js_path} (Lewati)")
else:
    print("! File js/app.js tidak ditemukan.")

print("==================================================")
print("Pembaruan selesai! Silakan buka/refresh web di browser.")
print("==================================================")
