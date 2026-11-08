import redis
from pymongo import MongoClient

from app.core.config import settings

TOOLS = ["lookup_customer", "send_email", "create_quote", "update_crm_record", "edit_customer_info"]

db = MongoClient(settings.mongodb_uri)[settings.mongodb_db]
r = redis.from_url(settings.redis_url)

agents = list(db.agents.find({"name": "Sales Agent"}))
if not agents:
    print("No agent named 'Sales Agent' found.")
else:
    for a in agents:
        print(f"Found Sales Agent {a['key_prefix']}... (company id {a['org_id']}, {a['status']})")
    if input("Delete ALL data of these agents? Type yes: ").strip().lower() == "yes":
        for a in agents:
            aid, org = str(a["_id"]), a["org_id"]
            print("policies :", db.policies.delete_many({"agent_id": aid}).deleted_count)
            print("approvals:", db.approvals.delete_many({"agent_id": aid}).deleted_count)
            print("audit    :", db.audit_logs.delete_many({"agent_id": aid}).deleted_count)
            print("tools    :", db.tools.delete_many({"org_id": org, "name": {"$in": TOOLS}}).deleted_count)
            for k in r.scan_iter(f"rl:{aid}:*"):
                r.delete(k)
            db.agents.delete_one({"_id": a["_id"]})
        print("Done. Sales Agent wiped.")
    else:
        print("Cancelled, nothing deleted.")