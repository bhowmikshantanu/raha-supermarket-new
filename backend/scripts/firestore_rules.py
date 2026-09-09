"""Fetch / deploy Firestore security rules with the backend service account.

Usage:
  python scripts/firestore_rules.py fetch  <out.rules>
  python scripts/firestore_rules.py deploy <in.rules>
"""

import json
import sys
import urllib.request

from google.auth.transport.requests import Request
from google.oauth2 import service_account

PROJECT = "raha-supermarket"
SA_PATH = "firebase-service-account.json"
API = "https://firebaserules.googleapis.com/v1"


def _token() -> str:
    creds = service_account.Credentials.from_service_account_file(
        SA_PATH,
        scopes=[
            "https://www.googleapis.com/auth/firebase",
            "https://www.googleapis.com/auth/cloud-platform",
        ],
    )
    creds.refresh(Request())
    return creds.token


def _call(method: str, path: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{API}/{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {_token()}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch(out_path: str) -> None:
    rel = _call("GET", f"projects/{PROJECT}/releases/cloud.firestore")
    rs = _call("GET", rel["rulesetName"])
    content = rs["source"]["files"][0]["content"]
    open(out_path, "w").write(content)
    print("release:", rel["rulesetName"], rel.get("updateTime"))
    print("saved", out_path, len(content.splitlines()), "lines")


def deploy(in_path: str) -> None:
    content = open(in_path).read()
    ruleset = _call(
        "POST",
        f"projects/{PROJECT}/rulesets",
        {"source": {"files": [{"name": "firestore.rules", "content": content}]}},
    )
    print("created ruleset:", ruleset["name"])
    rel = _call(
        "PATCH",
        f"projects/{PROJECT}/releases/cloud.firestore",
        {
            "release": {
                "name": f"projects/{PROJECT}/releases/cloud.firestore",
                "rulesetName": ruleset["name"],
            }
        },
    )
    print("release updated:", rel["rulesetName"], rel.get("updateTime"))


if __name__ == "__main__":
    cmd, path = sys.argv[1], sys.argv[2]
    fetch(path) if cmd == "fetch" else deploy(path)
