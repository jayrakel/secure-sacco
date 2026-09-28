import requests
import json

base_url = 'http://10.224.101.92:8080'
session = requests.Session()

# 1. Login to get session and CSRF token
login_data = {
    "identifier": "admin@jaytechwave.org",
    "password": "Admin@12345678"
}
print("Logging in...")
response = session.post(f"{base_url}/api/v1/auth/login", json=login_data)
if response.status_code != 200:
    print(f"Login failed: {response.status_code}")
    print(response.text)
    exit(1)

csrf_token = session.cookies.get('XSRF-TOKEN')
print(f"Logged in successfully. CSRF Token: {csrf_token}")

# 2. Seed the member
member_data = {
  "firstName": "Benjamin",
  "lastName": "Muketha",
  "email": "muketha63.bm@gmail.com",
  "phoneNumber": "+254721338747",
  "plainTextPassword": "Password123!",
  "registrationDate": "2022-09-01"
}
headers = {
    "X-XSRF-TOKEN": csrf_token,
    "Content-Type": "application/json"
}

print("Seeding member Benjamin Muketha...")
response = session.post(f"{base_url}/api/v1/migration/members", json=member_data, headers=headers)

if response.status_code in [200, 201]:
    print("Member seeded successfully!")
    print(response.text)
else:
    print(f"Failed to seed member: {response.status_code}")
    print(response.text)
