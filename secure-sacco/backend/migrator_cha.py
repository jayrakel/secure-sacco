import requests
import csv
from datetime import datetime
import time
import os

# ==========================================
# CONFIGURATION
# ==========================================
BASE_URL = "http://localhost:8080/api/v1"
EMAIL = "jaytechwavesolutions@gmail.com"
PASSWORD = "Michira._2000"
MEMBER_NUMBER = "BVL-2022-000003"

CSV_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(CSV_DIR, "Statement_BVL-2022-000003_all.csv")

session = requests.Session()
csrf_token = ""
current_virtual_date = datetime.strptime("2022-08-01", "%Y-%m-%d")
active_loan_id = ""

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

# ==========================================
# SMART RATE LIMITER (THE FIX)
# ==========================================
def make_safe_request(method, url, **kwargs):
    time.sleep(0.3) # Small delay to reduce chance of hitting rate limits
    while True:
        if method.upper() == 'POST':
            res = session.post(url, **kwargs)
        elif method.upper() == 'DELETE':
            res = session.delete(url, **kwargs)
        else:
            res = session.get(url, **kwargs)

        if res.status_code == 429:
            try:
                retry_after = int(res.json().get('retryAfter', 3))
            except:
                retry_after = 3
            print(f"    ⏳ [RATE LIMIT] Backend needs a breather. Pausing for {retry_after} seconds...")
            time.sleep(retry_after + 0.5) # Add half a second buffer
        else:
            return res

# ==========================================
# TIME TRAVEL ENGINE
# ==========================================
# def wipe_member_data():
#     print(f"\n🧹 Wiping previous migration data for {MEMBER_NUMBER}...")
#     make_safe_request('DELETE', f"{BASE_URL}/migration/cleanup/{MEMBER_NUMBER}", headers=get_headers())

def jump_to_date(target_date_str, date_format="%d %b %Y"):
    global current_virtual_date
    target_date = datetime.strptime(target_date_str, date_format)
    delta = (target_date - current_virtual_date).days

    if delta > 0:
        print(f"  🕰️ Advancing clock by {delta} days to {target_date.strftime('%Y-%m-%d')}...")
        response = make_safe_request('POST', f"{BASE_URL}/time-travel/advance?days={delta}", headers=get_headers())
        if response.status_code == 200:
            current_virtual_date = target_date
            time.sleep(1) # Let cron finish
        else:
            print(f"❌ Time Travel Failed: {response.text}")
            exit()

# ==========================================
# LOAN ACTIONS
# ==========================================
def disburse_initial_loan():
    global active_loan_id
    print("\n💰 Disbursing Loan 1 (Initial)...")
    payload = {
        "memberNumber": MEMBER_NUMBER,
        "loanProductCode": "Historical Smart Loan",
        "principal": 155752.00,
        "interest": 31150.40,
        "weeklyScheduled": 1797.14,
        "firstPaymentDate": "2022-09-08", # 28 Days Grace Period
        "termWeeks": 104,
        "referenceNumber": "MIG-CHA-L1-DISB"
    }
    res = make_safe_request('POST', f"{BASE_URL}/migration/loans/disburse", json=payload, headers=get_headers())
    if res.status_code == 200:
        active_loan_id = res.json().get('id', res.text.strip().strip('"'))
        print("✅ Loan 1 Disbursed!")
    else:
        print(f"❌ Loan 1 Failed: {res.text}")
        exit()

def refinance_loan_2():
    global active_loan_id
    print("\n🔄 REFINANCING TO LOAN 2 (Restructure, No Cash)...")
    payload = {
        "oldLoanId": active_loan_id,
        "loanProductCode": "Historical Smart Loan",
        "topUpAmount": 0.00,
        "interestOverride": 46444.02,
        "newTermWeeks": 156,
        "referenceNumber": "MIG-CHA-L2-REF",
        "historicalDateOverride": "2023-09-07",
        "firstPaymentDate": "2023-09-14"
    }
    res = make_safe_request('POST', f"{BASE_URL}/loans/applications/refinance", json=payload, headers=get_headers())
    if res.status_code == 200:
        active_loan_id = res.json().get('id', res.text.strip().strip('"'))
        print("✅ Refinanced to Loan 2!")

def restructure_loan_3():
    global active_loan_id
    print("\n⚠️ REFINANCING TO LOAN 3 (100k Top-Up)...")
    payload = {
        "oldLoanId": active_loan_id,
        "loanProductCode": "Historical Smart Loan",
        "topUpAmount": 100000.00,
        "interestOverride": 30000.00,
        "newTermWeeks": 156,
        "referenceNumber": "MIG-CHA-L3-REF",
        "historicalDateOverride": "2024-01-04",
        "firstPaymentDate": "2024-01-11"
    }
    res = make_safe_request('POST', f"{BASE_URL}/loans/applications/refinance", json=payload, headers=get_headers())
    if res.status_code == 200:
        active_loan_id = res.json().get('id', res.text.strip().strip('"'))
        print("✅ Restructured to Loan 3!")

def submit_payment(api_date, amount, ref):
    print(f"  💵 Submitting Loan Repayment: KES {amount} on {api_date}")
    make_safe_request('POST', f"{BASE_URL}/migration/loans/repay", json={
        "memberNumber": MEMBER_NUMBER, "amount": amount, "transactionDate": api_date, "referenceNumber": ref
    }, headers=get_headers())

def submit_penalty(api_date, amount, ref):
    print(f"  🚨 Submitting Penalty Fine: KES {amount} on {api_date}")
    make_safe_request('POST', f"{BASE_URL}/penalties/repay", json={
        "memberNumber": MEMBER_NUMBER, "amount": amount, "transactionDate": api_date, "referenceNumber": ref
    }, headers=get_headers())

# ==========================================
# MAIN EXECUTION
# ==========================================
if __name__ == "__main__":
    login()
    # wipe_member_data()

    # 1. Reset and Configure Time Traveler
    make_safe_request('POST', f"{BASE_URL}/time-travel/configure", json={"startDate": "2022-08-01", "endDate": "2025-11-20", "daysPerTick": 7}, headers=get_headers())
    make_safe_request('POST', f"{BASE_URL}/time-travel/reset", headers=get_headers())

    # 2. Start the journey
    disburse_initial_loan()

    triggered_loan_2 = False
    triggered_loan_3 = False

    # 3. Read CSV and playback history
    with open(CSV_FILE, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)

        for row in reader:
            date_str = row['Date'].strip()
            module = row.get('Module', '').strip()
            row_type = row.get('Type', '').strip()
            ref = row['Reference'].strip()

            amount_str = row.get('Credit', '').replace(',', '').strip()
            if not amount_str: continue
            amount = float(amount_str)

            if amount <= 0: continue

            # --- MILESTONE CHECKS ---
            if not triggered_loan_2 and datetime.strptime(date_str, "%d %b %Y") >= datetime.strptime("07 Sep 2023", "%d %b %Y"):
                jump_to_date("07 Sep 2023")
                refinance_loan_2()
                triggered_loan_2 = True

            if not triggered_loan_3 and datetime.strptime(date_str, "%d %b %Y") >= datetime.strptime("04 Jan 2024", "%d %b %Y"):
                jump_to_date("04 Jan 2024")
                restructure_loan_3()
                triggered_loan_3 = True

            # --- NORMAL FLOW ---
            jump_to_date(date_str)
            api_date = datetime.strptime(date_str, "%d %b %Y").strftime("%Y-%m-%d")

            if module == 'LOANS' and row_type == 'REPAYMENT':
                submit_payment(api_date, amount, ref)
            elif module == 'PENALTIES' and row_type == 'PENALTY_REPAYMENT':
                submit_penalty(api_date, amount, ref)

    # Final jump to today to lock in the arrears calculation
    jump_to_date("20 Nov 2025")

    print(f"\n🎉 CHARLES GICHERU MIGRATION COMPLETE!")
    print("  📊 Expected Final Balance: KES 278,557.50")
    print("  📊 Expected Final Arrears: KES 162,275.38")
    print("  📊 Check the UI to confirm the balances and arrears are correct.")
    print("  📊 Arrears will now accurately reflect the 28-day Grace Periods!")