import requests
import csv
from datetime import datetime
import time
import os

# ==========================================
# CONFIGURATION
# ==========================================
# BASE_URL = "https://staging.jaytechwavesolutions.co.ke/api/v1"
# EMAIL = "admin@jaytechwavesolutions.co.ke"
# PASSWORD = "Michira._2000"
#
BASE_URL = "http://localhost:8080/api/v1"
EMAIL = "jaytechwavesolutions@gmail.com"
PASSWORD = "Michira._2000"

CSV_DIR = os.path.dirname(os.path.abspath(__file__))
session = requests.Session()
csrf_token = ""

def login():
    global csrf_token
    print("🔐 Logging in...")
    response = session.post(f"{BASE_URL}/auth/login", json={"identifier": EMAIL, "password": PASSWORD})
    if response.status_code == 200:
        csrf_token = session.cookies.get('XSRF-TOKEN')
        print("✅ Login successful!")
    else:
        print(f"❌ Login failed: {response.text}")
        exit()

def get_headers():
    return {"Content-Type": "application/json", "X-XSRF-TOKEN": csrf_token}

# def wipe_member_data(member_number):
#     print(f"  🧹 Wiping previous migration data for {member_number}...")
#     res = session.delete(f"{BASE_URL}/migration/cleanup/{member_number}", headers=get_headers())
#     if res.status_code == 200:
#         print("  ✅ Cleanup successful. Clean slate achieved.")
#     else:
#         print(f"  ⚠️ Cleanup warning: {res.text}")

def configure_time_traveler(start_date, end_date):
    global current_virtual_date
    current_virtual_date = datetime.strptime(start_date, "%Y-%m-%d")
    session.post(f"{BASE_URL}/time-travel/configure", json={
        "startDate": start_date, "endDate": end_date, "daysPerTick": 7
    }, headers=get_headers())
    session.post(f"{BASE_URL}/time-travel/reset", headers=get_headers())
    print(f"  ⏱️  Time traveler configured: {start_date} → {end_date}")

def jump_to_date(target_date_str, fmt="%d %b %Y"):
    global current_virtual_date
    target = datetime.strptime(target_date_str, fmt)
    delta = (target - current_virtual_date).days
    if delta > 0:
        print(f"  🕰️  Advancing {delta} days → {target.strftime('%Y-%m-%d')}...")
        res = session.post(f"{BASE_URL}/time-travel/advance?days={delta}", headers=get_headers())
        if res.status_code == 200:
            current_virtual_date = target
            time.sleep(1)  # Let Cron evaluate gaps and generate penalties!
        else:
            print(f"  ❌ Time travel failed: {res.text}")
            exit()

# ==========================================
# API ACTIONS
# ==========================================
def disburse_loan(payload):
    res = session.post(f"{BASE_URL}/migration/loans/disburse", json=payload, headers=get_headers())
    if res.status_code == 200:
        return res.json().get('id', res.text.strip().strip('"'))
    else:
        print(f"  ❌ Disburse failed: {res.text}")
        exit()

def refinance_loan(payload):
    res = session.post(f"{BASE_URL}/loans/applications/refinance", json=payload, headers=get_headers())
    if res.status_code == 200:
        return res.json().get('id', res.text.strip().strip('"'))
    else:
        print(f"  ❌ Refinance failed: {res.text}")
        exit()

def submit_repayment(payload):
    res = session.post(f"{BASE_URL}/migration/loans/repay", json=payload, headers=get_headers())
    if res.status_code not in [200, 201]:
        print(f"  ❌ Repayment FAILED: {res.text}")
        exit() # 🚨 HALT TO PROTECT LEDGER

def submit_penalty_payment(payload):
    # 🚨 Adjust this endpoint if your penalty repayment controller uses a different URL!
    res = session.post(f"{BASE_URL}/penalties/repay", json=payload, headers=get_headers())
    if res.status_code not in [200, 201]:
        print(f"  ⚠️ Penalty Repayment Warning: {res.text}")

# ==========================================
# MIGRATION RUNNER
# ==========================================
def migrate_salesio():
    member = "BVL-2022-000002"
    print(f"\n{'='*60}\n🚀 MIGRATING: Salesio Mwiraria ({member})\n{'='*60}")

    # wipe_member_data(member)
    configure_time_traveler("2023-01-12", "2025-11-20")

    # 1. DISBURSE INITIAL LOAN
    print("  💰 Disbursing Loan 1...")
    active_loan_id = disburse_loan({
        "memberNumber": member, "loanProductCode": "Historical Smart Loan",
        "principal": 50000.00, "interest": 5016.00, "weeklyScheduled": 1058.00,
        "firstPaymentDate": "2023-01-19", "termWeeks": 52, "referenceNumber": "MIG-SAL-L1-DISB"
    })

    triggered_l2 = False
    triggered_l3 = False

    with open(os.path.join(CSV_DIR, "Statement_BVL-2022-000002_all.csv"), encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            module = row.get('Module', '').strip()
            row_type = row.get('Type', '').strip()
            date_str = row['Date'].strip()
            date_obj = datetime.strptime(date_str, "%d %b %Y")
            amount = float(row.get('Credit', '0').replace(',', '').strip() or 0)

            if amount <= 0: continue

            # 2. CHECK FOR REFINANCE MILESTONES
            if not triggered_l2 and date_obj >= datetime(2023, 10, 12):
                jump_to_date("12 Oct 2023")
                print("  💰 Disbursing BRAND NEW Loan 2 (Old loan was fully paid off!)...")
                active_loan_id = disburse_loan({
                    "memberNumber": member,
                    "loanProductCode": "Historical Smart Loan",
                    "principal": 200000.00,
                    "interest": 40000.80,
                    "weeklyScheduled": 2307.70,
                    "firstPaymentDate": "2023-10-19",
                    "termWeeks": 104,
                    "referenceNumber": "MIG-SAL-L2-DISB"
                })
                triggered_l2 = True

            if not triggered_l3 and date_obj >= datetime(2024, 10, 10): # 🚨 Changed 3 to 10
                jump_to_date("10 Oct 2024") # 🚨 Changed 03 to 10
                print("  💰 Disbursing BRAND NEW Loan 3 (Loan 2 was perfectly cleared last week)...")
                active_loan_id = disburse_loan({
                    "memberNumber": member,
                    "loanProductCode": "Historical Smart Loan",
                    "principal": 100000.00,
                    "interest": 20000.40,
                    "weeklyScheduled": 1153.85,
                    "firstPaymentDate": "2024-09-12",
                    "termWeeks": 104,
                    "referenceNumber": "MIG-SAL-L3-DISB"
                })
                triggered_l3 = True

            # 3. ADVANCE CLOCK AND PAY
            jump_to_date(date_str)
            api_date = date_obj.strftime("%Y-%m-%d")

            if module == 'LOANS' and row_type == 'REPAYMENT':
                print(f"  💵 Submitting Loan Repayment: KES {amount} on {api_date}")
                submit_repayment({"memberNumber": member, "amount": amount, "transactionDate": api_date, "referenceNumber": row['Reference']})

            elif module == 'PENALTIES' and row_type == 'PENALTY_REPAYMENT':
                print(f"  🚨 Submitting Penalty Fine: KES {amount} on {api_date}")
                submit_penalty_payment({"memberNumber": member, "amount": amount, "transactionDate": api_date, "referenceNumber": row['Reference']})

    jump_to_date("20 Nov 2025")
    print("\n🎉 SALESIO MIGRATION COMPLETE! Check the UI balances.")

if __name__ == "__main__":
    login()
    migrate_salesio()