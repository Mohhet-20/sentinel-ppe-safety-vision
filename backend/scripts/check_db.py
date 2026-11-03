import sqlite3
import sys

db = 'sentinel.db'
conn = sqlite3.connect(db)
cols = [r[1] for r in conn.execute("PRAGMA table_info('users')")]
print('users columns:', cols)
# check alembic_version
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print('tables:', tables)
try:
    ver = conn.execute('SELECT version_num FROM alembic_version').fetchone()
    print('alembic_version:', ver)
except Exception as e:
    print('alembic_version table missing or error:', e)
conn.close()
