import psycopg2
import sys

def get_schema(table_name):
    try:
        conn = psycopg2.connect(dbname="sacco_prod")
        cur = conn.cursor()
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s", (table_name,))
        columns = cur.fetchall()
        for col in columns:
            print(f"{col[0]}: {col[1]}")
    except Exception as e:
        print(e)
        sys.exit(1)

get_schema("penalty_accruals")
print("---")
get_schema("savings_accounts")
