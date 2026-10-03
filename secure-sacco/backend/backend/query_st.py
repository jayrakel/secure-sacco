import psycopg2

try:
    conn = psycopg2.connect(dbname="sacco_prod")
    cur = conn.cursor()
    cur.execute("SELECT id, transaction_type, amount, status FROM savings_transactions WHERE reference = 'UJ23S92FBZ'")
    rows = cur.fetchall()
    for row in rows:
        print(row)
except Exception as e:
    print(e)
