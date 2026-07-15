#!/usr/bin/env python3
"""
withdrawals_seeder.py
---------------------
Async withdrawal seeder — converts `withdrawals-seeder.http` into a runnable
Python script.

Features:
- Logs in once and reuses the session cookie + XSRF token.
- Posts withdrawal migration requests concurrently with aiohttp.
- Logs success/failure per reference number.
- Saves failed requests to `failed_withdrawals.json` for retry/debugging.

Requirements:
    pip install -r requirements.txt

Usage:
    python3 withdrawals_seeder.py
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
import time
from typing import Any

import aiohttp

# ── Configuration ─────────────────────────────────────────────────────────────
BASE_URL = "https://betterlinkventureslimited.co.ke"
LOGIN_URL = f"{BASE_URL}/api/v1/auth/login"
SEED_URL = f"{BASE_URL}/api/v1/migration/withdrawals"
CREDENTIALS = {
    "identifier": "admin@betterlinkventureslimited.co.ke",
    "password": "Michira._2000",
}
CONCURRENCY = 20  # simultaneous requests — raise/lower to taste
# ─────────────────────────────────────────────────────────────────────────────

TRANSACTIONS: list[dict[str, Any]] = [
    {
        "memberNumber": "BVL-2022-000001",
        "amount": 144723.00,
        "referenceNumber": "PTR-BEN-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 40893.00,
        "referenceNumber": "PTR-SAL-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 164947.00,
        "referenceNumber": "PTR-SAL-WDR-2024-OCT",
        "transactionDate": "2024-10-03",
    },
    {
        "memberNumber": "BVL-2022-000002",
        "amount": 67947.59,
        "referenceNumber": "PTR-SAL-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 18319.00,
        "referenceNumber": "PTR-CHA-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 10000.00,
        "referenceNumber": "PTR-CHA-WDR-2025-MAR",
        "transactionDate": "2025-03-20",
    },
    {
        "memberNumber": "BVL-2022-000003",
        "amount": 110776.97,
        "referenceNumber": "PTR-CHA-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 25090.00,
        "referenceNumber": "PTR-JAC-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000004",
        "amount": 71729.45,
        "referenceNumber": "PTR-JAC-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 19774.00,
        "referenceNumber": "PTR-MBU-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000005",
        "amount": 60479.81,
        "referenceNumber": "PTR-MBU-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 3312.00,
        "referenceNumber": "PTR-SAM-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000006",
        "amount": 95957.23,
        "referenceNumber": "PTR-SAM-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 49551.00,
        "referenceNumber": "PTR-GID-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000007",
        "amount": 102941.58,
        "referenceNumber": "PTR-GID-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 1188000.00,
        "referenceNumber": "PTR-STE-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000008",
        "amount": 20548.24,
        "referenceNumber": "PTR-STE-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 1000.00,
        "referenceNumber": "PTR-MOS-WDR-2024",
        "transactionDate": "2024-09-12",
    },
    {
        "memberNumber": "BVL-2022-000009",
        "amount": 12181.88,
        "referenceNumber": "PTR-MOS-WDR-2025",
        "transactionDate": "2025-09-01",
    },
    {
        "memberNumber": "BVL-2022-000010",
        "amount": 38525.63,
        "referenceNumber": "PTR-TAR-WDR-2025",
        "transactionDate": "2025-09-01",
    },
]


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
            raise RuntimeError(
                f"Login failed — could not extract cookies. Status: {resp.status}"
            )

        cookie_header = f"XSRF-TOKEN={xsrf}; SACCO_SESSION={session_tok}"
        print("[LOGIN] OK — XSRF token acquired.")
        return xsrf, cookie_header


async def post_transaction(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    xsrf: str,
    cookie: str,
    payload: dict[str, Any],
    index: int,
    total: int,
    failed: list[dict[str, Any]],
) -> None:
    headers = {
        "Content-Type": "application/json",
        "Cookie": cookie,
        "X-XSRF-TOKEN": xsrf,
    }
    ref = payload["referenceNumber"]

    async with sem:
        try:
            async with session.post(SEED_URL, json=payload, headers=headers) as resp:
                if resp.status in (200, 201):
                    print(f"  [{index:>4}/{total}] ✓  {ref}")
                    return

                body = await resp.text()
                if resp.status == 409:
                    print(f"  [{index:>4}/{total}] ↷  {ref} — duplicate already exists")
                else:
                    print(
                        f"  [{index:>4}/{total}] ✗  {ref} — HTTP {resp.status}: {body[:120]}"
                    )
                failed.append(
                    {
                        "index": index,
                        "payload": payload,
                        "status": resp.status,
                        "body": body,
                    }
                )
        except Exception as exc:
            print(f"  [{index:>4}/{total}] ✗  {ref} — ERROR: {exc}")
            failed.append({"index": index, "payload": payload, "error": str(exc)})


async def main() -> None:
    connector = aiohttp.TCPConnector(ssl=True)
    async with aiohttp.ClientSession(connector=connector) as session:
        xsrf, cookie = await login(session)

        transactions = TRANSACTIONS
        total = len(transactions)
        print(f"\n[SEED] Sending {total} withdrawal transactions with concurrency={CONCURRENCY}...\n")

        sem = asyncio.Semaphore(CONCURRENCY)
        failed: list[dict[str, Any]] = []
        t0 = time.perf_counter()

        tasks = [
            post_transaction(session, sem, xsrf, cookie, payload, i + 1, total, failed)
            for i, payload in enumerate(transactions)
        ]
        await asyncio.gather(*tasks)

        elapsed = time.perf_counter() - t0
        print(f"\n[DONE] {total - len(failed)}/{total} succeeded in {elapsed:.1f}s")

        if failed:
            out = "failed_withdrawals.json"
            with open(out, "w", encoding="utf-8") as f:
                json.dump(failed, f, indent=2)
            print(f"[WARN] {len(failed)} failed — details saved to {out}")
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())

