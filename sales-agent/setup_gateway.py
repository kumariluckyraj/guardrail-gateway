import getpass
import os
import sys

import httpx

BASE = os.getenv("GATEWAY_URL", "http://localhost:8000")
MOCK = os.getenv("MOCK_BASE_URL", "http://localhost:8001")

TOOLS = [
    ("lookup_customer", "Find customers by name, email or company", "GET", "low", "/mock/crm/lookup"),
    ("send_email", "Send an email to a customer", "POST", "low", "/mock/email/send"),
    ("create_quote", "Create a quotation", "POST", "high", "/mock/quote/create"),
    ("update_crm_record", "Update CRM stage or notes", "POST", "medium", "/mock/crm/update"),
    ("edit_customer_info", "Edit customer contact details", "POST", "high", "/mock/customer/edit"),
]

POLICIES = {
    "lookup_customer": {"rate_limit": {"max_calls": 30, "window_seconds": 60}, "approval": {"mode": "never"}},
    "send_email": {"rate_limit": {"max_calls": 5, "window_seconds": 60}, "approval": {"mode": "never"}},
    "create_quote": {
        "rate_limit": {"max_calls": 10, "window_seconds": 60},
        "approval": {"mode": "conditional", "field": "amount", "operator": "gt", "value": 100000},
    },
    "update_crm_record": {"rate_limit": {"max_calls": 20, "window_seconds": 60}, "approval": {"mode": "never"}},
    "edit_customer_info": {"rate_limit": {"max_calls": 5, "window_seconds": 60}, "approval": {"mode": "always"}},
}


def check(r: httpx.Response, what: str) -> dict:
    if r.status_code >= 400:
        print(f"FAILED: {what} -> {r.status_code} {r.text[:300]}")
        sys.exit(1)
    return r.json() if r.content else {}


def main() -> None:
    email = input("Dashboard email: ").strip()
    password = getpass.getpass("Dashboard password: ")

    with httpx.Client(base_url=BASE, timeout=20) as c:
        check(c.post("/auth/login", json={"email": email, "password": password}), "login")

        agents = [a for a in check(c.get("/agents"), "list agents") if a["status"] == "active"]
        if not agents:
            print("No active agent. Create one first (POST /agents).")
            sys.exit(1)
        agent = agents[0]
        if len(agents) > 1:
            for i, a in enumerate(agents):
                print(f"[{i}] {a['name']}  {a['key_prefix']}...  id={a['id']}")
            agent = agents[int(input("Which agent number? "))]
        print(f"Using agent {agent['name']} ({agent['key_prefix']}...)")

        existing = {t["name"]: t for t in check(c.get("/tools"), "list tools")}
        for name, desc, method, risk, path in TOOLS:
            spec = {"description": desc, "upstream_url": MOCK + path, "http_method": method, "risk_level": risk}
            if name in existing:
                tool = check(c.patch(f"/tools/{existing[name]['id']}", json=spec), f"update tool {name}")
            else:
                tool = check(c.post("/tools", json={"name": name, **spec}), f"create tool {name}")
            check(
                c.put("/policies", json={"agent_id": agent["id"], "tool_id": tool["id"],
                                         "allowed": True, **POLICIES[name]}),
                f"policy for {name}",
            )
            print(f"  ok  {name}  ({risk})")

    print("Done.")


if __name__ == "__main__":
    main()