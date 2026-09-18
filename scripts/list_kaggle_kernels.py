import json
import os
import requests

kaggle_json = os.path.join(os.environ["USERPROFILE"], ".kaggle", "kaggle.json")
with open(kaggle_json) as f:
    creds = json.load(f)

headers = {"Authorization": f"Bearer {creds['key']}"}
base_url = "https://www.kaggle.com/api/v1"

r = requests.get(f"{base_url}/kernels/list?user={creds.get('username', 'mokshdasharma')}", headers=headers)
print("HTTP Status:", r.status_code)
if r.status_code == 200:
    kernels = r.json()
    print(f"Found {len(kernels)} kernels:")
    for k in kernels:
        ref = k.get("ref", "")
        title = k.get("title", "")
        total_votes = k.get("totalVotes", 0)
        print(f"  * Ref: {ref} | Title: {title}")
else:
    print(r.text)
