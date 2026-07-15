#!/usr/bin/env python3
"""
savings_seeder.py
-----------------
Async savings seeder — replaces savings-seeder.http.
Uses aiohttp + asyncio for concurrent requests (much faster than the
sequential HTTP file runner).

Requirements:
    pip install aiohttp

Usage:
    python3 savings_seeder.py
"""

import asyncio
import json
import re
import sys
import time

import aiohttp

# ── Configuration ────────────────────────────────────────────────────────────
BASE_URL    = "https://betterlinkventureslimited.co.ke"
LOGIN_URL   = f"{BASE_URL}/api/v1/auth/login"
SEED_URL    = f"{BASE_URL}/api/v1/migration/savings"
CREDENTIALS = {"identifier": "admin@betterlinkventureslimited.co.ke", "password": "Michira._2000"}
CONCURRENCY = 20   # simultaneous requests — raise/lower to taste
# ─────────────────────────────────────────────────────────────────────────────


async def login(session: aiohttp.ClientSession) -> tuple[str, str]:
    """Login and return (xsrf_token, cookie_header)."""
    async with session.post(LOGIN_URL, json=CREDENTIALS) as resp:
        resp.raise_for_status()
        xsrf = session_tok = ""
        for header_val in resp.headers.getall("Set-Cookie", []):
            m = re.search(r"XSRF-TOKEN=([^;]+)", header_val)
            if m:
                xsrf = m.group(1)
            m = re.search(r"SACCO_SESSION=([^;]+)", header_val)
            if m:
                session_tok = m.group(1)
        if not xsrf or not session_tok:
            raise RuntimeError(f"Login failed — could not extract cookies. Status: {resp.status}")
        cookie_header = f"XSRF-TOKEN={xsrf}; SACCO_SESSION={session_tok}"
        print(f"[LOGIN] OK — XSRF token acquired.")
        return xsrf, cookie_header


async def post_transaction(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    xsrf: str,
    cookie: str,
    payload: dict,
    index: int,
    total: int,
    failed: list,
) -> None:
    headers = {
        "Content-Type": "application/json",
        "Cookie": cookie,
        "X-XSRF-TOKEN": xsrf,
    }
    async with sem:
        try:
            async with session.post(SEED_URL, json=payload, headers=headers) as resp:
                if resp.status in (200, 201):
                    print(f"  [{index:>4}/{total}] ✓  {payload['referenceNumber']}")
                else:
                    body = await resp.text()
                    print(f"  [{index:>4}/{total}] ✗  {payload['referenceNumber']} — HTTP {resp.status}: {body[:120]}")
                    failed.append({"index": index, "payload": payload, "status": resp.status, "body": body})
        except Exception as exc:
            print(f"  [{index:>4}/{total}] ✗  {payload['referenceNumber']} — ERROR: {exc}")
            failed.append({"index": index, "payload": payload, "error": str(exc)})


async def main() -> None:
    connector = aiohttp.TCPConnector(ssl=True)
    async with aiohttp.ClientSession(connector=connector) as session:
        xsrf, cookie = await login(session)

        transactions = TRANSACTIONS
        total = len(transactions)
        print(f"\n[SEED] Sending {total} transactions with concurrency={CONCURRENCY}...\n")

        sem = asyncio.Semaphore(CONCURRENCY)
        failed: list = []
        t0 = time.perf_counter()

        tasks = [
            post_transaction(session, sem, xsrf, cookie, payload, i + 1, total, failed)
            for i, payload in enumerate(transactions)
        ]
        await asyncio.gather(*tasks)

        elapsed = time.perf_counter() - t0
        print(f"\n[DONE] {total - len(failed)}/{total} succeeded in {elapsed:.1f}s")

        if failed:
            out = "failed_savings.json"
            with open(out, "w") as f:
                json.dump(failed, f, indent=2)
            print(f"[WARN] {len(failed)} failed — details saved to {out}")
            sys.exit(1)



TRANSACTIONS = [
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 573852.0,
        "referenceNumber": "MIG-SAV-BEN-BASE",
        "transactionDate": "2022-08-31"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 4000.0,
        "referenceNumber": "PTR-BEN-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 828.0,
        "referenceNumber": "PTR-BEN-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 419016.0,
        "referenceNumber": "PTR-BEN-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 900.0,
        "referenceNumber": "PTR-BEN-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 8539.0,
        "referenceNumber": "PTR-BEN-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 900.0,
        "referenceNumber": "PTR-BEN-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 500.0,
        "referenceNumber": "PTR-BEN-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 5000.0,
        "referenceNumber": "PTR-BEN-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 1000.0,
        "referenceNumber": "PTR-BEN-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 4000.0,
        "referenceNumber": "PTR-BEN-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 5000.0,
        "referenceNumber": "PTR-BEN-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 3000.0,
        "referenceNumber": "PTR-BEN-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2100.0,
        "referenceNumber": "PTR-BEN-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 4000.0,
        "referenceNumber": "PTR-BEN-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 2000.0,
        "referenceNumber": "PTR-BEN-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 18905.38,
        "referenceNumber": "PTR-BEN-2025-09-01",
        "transactionDate": "2025-09-01"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 11000.0,
        "referenceNumber": "PTR-BEN-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 13000.0,
        "referenceNumber": "PTR-BEN-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 15000.0,
        "referenceNumber": "PTR-BEN-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 11000.0,
        "referenceNumber": "PTR-BEN-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 24100.0,
        "referenceNumber": "PTR-BEN-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 20000.0,
        "referenceNumber": "PTR-BEN-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 11000.0,
        "referenceNumber": "PTR-BEN-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 30000.0,
        "referenceNumber": "PTR-BEN-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 15000.0,
        "referenceNumber": "PTR-BEN-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 12000.0,
        "referenceNumber": "PTR-BEN-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 15100.0,
        "referenceNumber": "PTR-BEN-2025-11-13",
        "transactionDate": "2025-11-13"
    },
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 15000.0,
        "referenceNumber": "PTR-BEN-2025-11-20",
        "transactionDate": "2025-11-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 308235.0,
        "referenceNumber": "MIG-SAV-SAL-BASE",
        "transactionDate": "2022-08-31"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 241279.0,
        "referenceNumber": "PTR-SAL-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 584.0,
        "referenceNumber": "PTR-SAL-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 200.0,
        "referenceNumber": "PTR-SAL-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 8039.0,
        "referenceNumber": "PTR-SAL-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 500.0,
        "referenceNumber": "PTR-SAL-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 900.0,
        "referenceNumber": "PTR-SAL-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 900.0,
        "referenceNumber": "PTR-SAL-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAL-2025-11-13",
        "transactionDate": "2025-11-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 74810.0,
        "referenceNumber": "PTR-CHA-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 8539.0,
        "referenceNumber": "PTR-CHA-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 500.0,
        "referenceNumber": "PTR-CHA-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 2000.0,
        "referenceNumber": "PTR-CHA-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 1000.0,
        "referenceNumber": "PTR-CHA-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 34955.0,
        "referenceNumber": "PTR-JAC-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 8539.0,
        "referenceNumber": "PTR-JAC-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 500.0,
        "referenceNumber": "PTR-JAC-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 1000.0,
        "referenceNumber": "PTR-JAC-2025-11-13",
        "transactionDate": "2025-11-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 63106.0,
        "referenceNumber": "PTR-MBU-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 8539.0,
        "referenceNumber": "PTR-MBU-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 500.0,
        "referenceNumber": "PTR-MBU-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 900.0,
        "referenceNumber": "PTR-MBU-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 1000.0,
        "referenceNumber": "PTR-MBU-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 74866.0,
        "referenceNumber": "PTR-SAM-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 840.0,
        "referenceNumber": "PTR-SAM-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 600.0,
        "referenceNumber": "PTR-SAM-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 600.0,
        "referenceNumber": "PTR-SAM-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 8539.0,
        "referenceNumber": "PTR-SAM-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2024-12-26",
        "transactionDate": "2024-12-26"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 900.0,
        "referenceNumber": "PTR-SAM-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 500.0,
        "referenceNumber": "PTR-SAM-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 1000.0,
        "referenceNumber": "PTR-SAM-2025-11-13",
        "transactionDate": "2025-11-13"
    },

    {
            "memberNumber": "BVL-2022-000007",
            "amount": 103674.0,
            "referenceNumber": "MIG-SAV-GID-BASE",
            "transactionDate": "2022-08-31"
        },

    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 107506.0,
        "referenceNumber": "PTR-GID-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 600.0,
        "referenceNumber": "PTR-GID-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 650.0,
        "referenceNumber": "PTR-GID-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 8039.0,
        "referenceNumber": "PTR-GID-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 550.0,
        "referenceNumber": "PTR-GID-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 500.0,
        "referenceNumber": "PTR-GID-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 1000.0,
        "referenceNumber": "PTR-GID-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 991661.0,
        "referenceNumber": "MIG-SAV-STE-BASE",
        "transactionDate": "2022-08-31"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 622196.0,
        "referenceNumber": "PTR-STE-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 800.0,
        "referenceNumber": "PTR-STE-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 900.0,
        "referenceNumber": "PTR-STE-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 9039.0,
        "referenceNumber": "PTR-STE-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 900.0,
        "referenceNumber": "PTR-STE-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 900.0,
        "referenceNumber": "PTR-STE-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 500.0,
        "referenceNumber": "PTR-STE-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 900.0,
        "referenceNumber": "PTR-STE-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1900.0,
        "referenceNumber": "PTR-STE-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 900.0,
        "referenceNumber": "PTR-STE-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 3000.0,
        "referenceNumber": "PTR-STE-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 3000.0,
        "referenceNumber": "PTR-STE-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 3000.0,
        "referenceNumber": "PTR-STE-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 3000.0,
        "referenceNumber": "PTR-STE-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 3000.0,
        "referenceNumber": "PTR-STE-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 2000.0,
        "referenceNumber": "PTR-STE-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 15000.0,
        "referenceNumber": "PTR-STE-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 10000.0,
        "referenceNumber": "PTR-STE-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 7900.0,
        "referenceNumber": "PTR-STE-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 6900.0,
        "referenceNumber": "PTR-STE-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 10900.0,
        "referenceNumber": "PTR-STE-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 4000.0,
        "referenceNumber": "PTR-STE-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 20000.0,
        "referenceNumber": "PTR-STE-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 16000.0,
        "referenceNumber": "PTR-STE-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1000.0,
        "referenceNumber": "PTR-STE-2025-11-13",
        "transactionDate": "2025-11-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 282978.0,
        "referenceNumber": "MIG-SAV-MOS-BASE",
        "transactionDate": "2022-08-31"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 522.0,
        "referenceNumber": "PTR-MOS-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 249057.0,
        "referenceNumber": "PTR-MOS-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 543.0,
        "referenceNumber": "PTR-MOS-2024-01-25",
        "transactionDate": "2024-01-25"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-07-25",
        "transactionDate": "2024-07-25"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 8539.0,
        "referenceNumber": "PTR-MOS-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-10-10",
        "transactionDate": "2024-10-10"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 500.0,
        "referenceNumber": "PTR-MOS-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-01-02",
        "transactionDate": "2025-01-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3600.0,
        "referenceNumber": "PTR-MOS-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 4761.0,
        "referenceNumber": "PTR-MOS-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 2000.0,
        "referenceNumber": "PTR-MOS-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 3000.0,
        "referenceNumber": "PTR-MOS-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.0,
        "referenceNumber": "PTR-MOS-2025-11-13",
        "transactionDate": "2025-11-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 296205.0,
        "referenceNumber": "MIG-SAV-TAR-BASE",
        "transactionDate": "2022-08-31"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-09-01",
        "transactionDate": "2022-09-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-09-08",
        "transactionDate": "2022-09-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-09-15",
        "transactionDate": "2022-09-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-09-22",
        "transactionDate": "2022-09-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-09-29",
        "transactionDate": "2022-09-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-10-06",
        "transactionDate": "2022-10-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-10-13",
        "transactionDate": "2022-10-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-10-20",
        "transactionDate": "2022-10-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-10-27",
        "transactionDate": "2022-10-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-11-03",
        "transactionDate": "2022-11-03"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-11-10",
        "transactionDate": "2022-11-10"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-11-17",
        "transactionDate": "2022-11-17"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-11-24",
        "transactionDate": "2022-11-24"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-12-01",
        "transactionDate": "2022-12-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-12-08",
        "transactionDate": "2022-12-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-12-15",
        "transactionDate": "2022-12-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-12-22",
        "transactionDate": "2022-12-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2022-12-29",
        "transactionDate": "2022-12-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-01-05",
        "transactionDate": "2023-01-05"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-01-12",
        "transactionDate": "2023-01-12"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-01-19",
        "transactionDate": "2023-01-19"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-01-26",
        "transactionDate": "2023-01-26"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-02-02",
        "transactionDate": "2023-02-02"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-02-09",
        "transactionDate": "2023-02-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 31000.0,
        "referenceNumber": "PTR-TAR-2023-02-16",
        "transactionDate": "2023-02-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-02-23",
        "transactionDate": "2023-02-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 800.0,
        "referenceNumber": "PTR-TAR-2023-03-02",
        "transactionDate": "2023-03-02"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-03-09",
        "transactionDate": "2023-03-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2023-03-16",
        "transactionDate": "2023-03-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-03-23",
        "transactionDate": "2023-03-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-03-30",
        "transactionDate": "2023-03-30"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-04-06",
        "transactionDate": "2023-04-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-04-13",
        "transactionDate": "2023-04-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-04-20",
        "transactionDate": "2023-04-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-04-27",
        "transactionDate": "2023-04-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-05-04",
        "transactionDate": "2023-05-04"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-05-11",
        "transactionDate": "2023-05-11"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-05-18",
        "transactionDate": "2023-05-18"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-05-25",
        "transactionDate": "2023-05-25"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-06-01",
        "transactionDate": "2023-06-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-06-08",
        "transactionDate": "2023-06-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-06-15",
        "transactionDate": "2023-06-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-06-22",
        "transactionDate": "2023-06-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-06-29",
        "transactionDate": "2023-06-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-07-06",
        "transactionDate": "2023-07-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-07-13",
        "transactionDate": "2023-07-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-07-20",
        "transactionDate": "2023-07-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-07-27",
        "transactionDate": "2023-07-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-08-03",
        "transactionDate": "2023-08-03"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-08-10",
        "transactionDate": "2023-08-10"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-08-17",
        "transactionDate": "2023-08-17"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-08-24",
        "transactionDate": "2023-08-24"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-08-31",
        "transactionDate": "2023-08-31"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 271538.0,
        "referenceNumber": "PTR-TAR-2023-09-07",
        "transactionDate": "2023-09-07"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-09-14",
        "transactionDate": "2023-09-14"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-09-21",
        "transactionDate": "2023-09-21"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-09-28",
        "transactionDate": "2023-09-28"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-10-05",
        "transactionDate": "2023-10-05"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-10-12",
        "transactionDate": "2023-10-12"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 522.0,
        "referenceNumber": "PTR-TAR-2023-10-19",
        "transactionDate": "2023-10-19"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-10-26",
        "transactionDate": "2023-10-26"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-11-02",
        "transactionDate": "2023-11-02"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-11-09",
        "transactionDate": "2023-11-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-11-16",
        "transactionDate": "2023-11-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-11-23",
        "transactionDate": "2023-11-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-11-30",
        "transactionDate": "2023-11-30"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-12-07",
        "transactionDate": "2023-12-07"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-12-14",
        "transactionDate": "2023-12-14"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-12-21",
        "transactionDate": "2023-12-21"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2023-12-28",
        "transactionDate": "2023-12-28"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-01-04",
        "transactionDate": "2024-01-04"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-01-11",
        "transactionDate": "2024-01-11"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-01-18",
        "transactionDate": "2024-01-18"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2024-02-01",
        "transactionDate": "2024-02-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-02-08",
        "transactionDate": "2024-02-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-02-15",
        "transactionDate": "2024-02-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-02-22",
        "transactionDate": "2024-02-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-02-29",
        "transactionDate": "2024-02-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-03-07",
        "transactionDate": "2024-03-07"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-03-14",
        "transactionDate": "2024-03-14"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-03-21",
        "transactionDate": "2024-03-21"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-03-28",
        "transactionDate": "2024-03-28"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-04-04",
        "transactionDate": "2024-04-04"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-04-11",
        "transactionDate": "2024-04-11"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-04-18",
        "transactionDate": "2024-04-18"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-04-25",
        "transactionDate": "2024-04-25"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-05-02",
        "transactionDate": "2024-05-02"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-05-09",
        "transactionDate": "2024-05-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-05-16",
        "transactionDate": "2024-05-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-05-23",
        "transactionDate": "2024-05-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-05-30",
        "transactionDate": "2024-05-30"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-06-06",
        "transactionDate": "2024-06-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-06-13",
        "transactionDate": "2024-06-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-06-20",
        "transactionDate": "2024-06-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-06-27",
        "transactionDate": "2024-06-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-07-04",
        "transactionDate": "2024-07-04"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-07-11",
        "transactionDate": "2024-07-11"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-07-18",
        "transactionDate": "2024-07-18"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-08-01",
        "transactionDate": "2024-08-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-08-08",
        "transactionDate": "2024-08-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-08-15",
        "transactionDate": "2024-08-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-08-22",
        "transactionDate": "2024-08-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-08-29",
        "transactionDate": "2024-08-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 8539.0,
        "referenceNumber": "PTR-TAR-2024-09-05",
        "transactionDate": "2024-09-05"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 2222.0,
        "referenceNumber": "PTR-TAR-2024-09-12",
        "transactionDate": "2024-09-12"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-09-19",
        "transactionDate": "2024-09-19"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-09-26",
        "transactionDate": "2024-09-26"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-10-03",
        "transactionDate": "2024-10-03"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2024-10-17",
        "transactionDate": "2024-10-17"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-10-24",
        "transactionDate": "2024-10-24"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-10-31",
        "transactionDate": "2024-10-31"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-11-07",
        "transactionDate": "2024-11-07"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-11-14",
        "transactionDate": "2024-11-14"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-11-21",
        "transactionDate": "2024-11-21"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-11-28",
        "transactionDate": "2024-11-28"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-12-05",
        "transactionDate": "2024-12-05"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-12-12",
        "transactionDate": "2024-12-12"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-12-19",
        "transactionDate": "2024-12-19"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2024-12-27",
        "transactionDate": "2024-12-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-01-09",
        "transactionDate": "2025-01-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-01-16",
        "transactionDate": "2025-01-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-01-23",
        "transactionDate": "2025-01-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-01-30",
        "transactionDate": "2025-01-30"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-02-06",
        "transactionDate": "2025-02-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-02-13",
        "transactionDate": "2025-02-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-02-20",
        "transactionDate": "2025-02-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-02-27",
        "transactionDate": "2025-02-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-03-06",
        "transactionDate": "2025-03-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 500.0,
        "referenceNumber": "PTR-TAR-2025-03-13",
        "transactionDate": "2025-03-13"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-03-20",
        "transactionDate": "2025-03-20"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-03-27",
        "transactionDate": "2025-03-27"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-04-03",
        "transactionDate": "2025-04-03"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-04-10",
        "transactionDate": "2025-04-10"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-04-17",
        "transactionDate": "2025-04-17"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-04-24",
        "transactionDate": "2025-04-24"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-05-01",
        "transactionDate": "2025-05-01"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-05-08",
        "transactionDate": "2025-05-08"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-05-15",
        "transactionDate": "2025-05-15"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-05-22",
        "transactionDate": "2025-05-22"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-05-29",
        "transactionDate": "2025-05-29"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-06-05",
        "transactionDate": "2025-06-05"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-06-12",
        "transactionDate": "2025-06-12"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-06-19",
        "transactionDate": "2025-06-19"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-06-26",
        "transactionDate": "2025-06-26"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-07-03",
        "transactionDate": "2025-07-03"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-07-10",
        "transactionDate": "2025-07-10"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-07-17",
        "transactionDate": "2025-07-17"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-07-24",
        "transactionDate": "2025-07-24"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-07-31",
        "transactionDate": "2025-07-31"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-08-07",
        "transactionDate": "2025-08-07"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-08-14",
        "transactionDate": "2025-08-14"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-08-21",
        "transactionDate": "2025-08-21"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-08-28",
        "transactionDate": "2025-08-28"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-09-04",
        "transactionDate": "2025-09-04"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-09-11",
        "transactionDate": "2025-09-11"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-09-18",
        "transactionDate": "2025-09-18"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-09-25",
        "transactionDate": "2025-09-25"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-10-02",
        "transactionDate": "2025-10-02"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-10-09",
        "transactionDate": "2025-10-09"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-10-16",
        "transactionDate": "2025-10-16"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-10-23",
        "transactionDate": "2025-10-23"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-10-30",
        "transactionDate": "2025-10-30"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1400.0,
        "referenceNumber": "PTR-TAR-2025-11-06",
        "transactionDate": "2025-11-06"
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 1000.0,
        "referenceNumber": "PTR-TAR-2025-11-13",
        "transactionDate": "2025-11-13"
    }
]


if __name__ == "__main__":
    asyncio.run(main())
