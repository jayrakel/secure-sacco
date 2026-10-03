import psycopg2

conn = psycopg2.connect(dbname="sacco_prod")
cur = conn.cursor()
cur.execute("SELECT id, email FROM users WHERE email ILIKE 'mwangigicheru4@gmail.com';")
for row in cur.fetchall():
    print(row)
