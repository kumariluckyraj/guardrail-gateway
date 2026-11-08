from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

EMAIL_RE = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"

CUSTOMERS: dict[str, dict] = {
    "c_001": {"id": "c_001", "name": "Rahul Sharma", "email": "rahul@example.com",
              "phone": "+91-98000-00001", "company": "Sharma Textiles", "stage": "lead", "notes": []},
    "c_002": {"id": "c_002", "name": "Priya Mehta", "email": "priya@example.com",
              "phone": "+91-98000-00002", "company": "Mehta Foods", "stage": "qualified", "notes": []},
    "c_003": {"id": "c_003", "name": "Amit Das", "email": "amit@example.com",
              "phone": "+91-98000-00003", "company": "Das Logistics", "stage": "proposal", "notes": []},
}
SENT_EMAILS: list[dict] = []
QUOTES: list[dict] = []


def require_gateway(x_guardrail_request_id: str | None = Header(default=None)):
    if not x_guardrail_request_id:
        raise HTTPException(status_code=401, detail="Tools can only be called through the gateway")


def _customer(customer_id: str) -> dict:
    c = CUSTOMERS.get(customer_id)
    if not c:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")
    return c


# Open, read-only view of the fake data (for the dashboard / debugging).
view_router = APIRouter(tags=["mock-view"])


@view_router.get("/state")
async def state():
    return {"customers": list(CUSTOMERS.values()), "emails": SENT_EMAILS[-20:], "quotes": QUOTES[-20:]}


# Gateway-only tool endpoints.
router = APIRouter(tags=["mock-tools"], dependencies=[Depends(require_gateway)])


@router.get("/crm/lookup")
async def lookup(query: str):
    q = query.strip().lower()
    matches = [
        c for c in CUSTOMERS.values()
        if q and (q in c["name"].lower() or q in c["email"].lower() or q in c["company"].lower())
    ]
    return {"matches": matches[:5]}


class EmailIn(BaseModel):
    to: str = Field(pattern=EMAIL_RE)
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


@router.post("/email/send")
async def send_email(data: EmailIn):
    msg = {"message_id": f"msg_{len(SENT_EMAILS) + 1:04d}", **data.model_dump(),
           "sent_at": datetime.now(timezone.utc).isoformat()}
    SENT_EMAILS.append(msg)
    return {"status": "sent", "message_id": msg["message_id"], "to": data.to}


class QuoteIn(BaseModel):
    customer_id: str
    amount: float = Field(gt=0)
    description: str = Field(default="", max_length=500)


@router.post("/quote/create")
async def create_quote(data: QuoteIn):
    c = _customer(data.customer_id)
    quote = {"quote_id": f"Q-{1001 + len(QUOTES)}", "customer_id": c["id"],
             "customer": c["name"], "amount": data.amount, "description": data.description}
    QUOTES.append(quote)
    return {"status": "created", **quote}


class CrmUpdateIn(BaseModel):
    customer_id: str
    stage: Literal["lead", "qualified", "proposal", "won", "lost"] | None = None
    note: str | None = Field(default=None, max_length=500)


@router.post("/crm/update")
async def crm_update(data: CrmUpdateIn):
    c = _customer(data.customer_id)
    if data.stage is None and not data.note:
        raise HTTPException(status_code=422, detail="Provide stage and/or note")
    if data.stage:
        c["stage"] = data.stage
    if data.note:
        c["notes"].append(data.note)
    return {"status": "updated", "customer": c}


class CustomerEditIn(BaseModel):
    customer_id: str
    name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, pattern=EMAIL_RE)
    phone: str | None = Field(default=None, max_length=30)
    company: str | None = Field(default=None, max_length=100)


@router.post("/customer/edit")
async def customer_edit(data: CustomerEditIn):
    c = _customer(data.customer_id)
    changes = data.model_dump(exclude={"customer_id"}, exclude_none=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one field to change")
    c.update(changes)
    return {"status": "updated", "customer": c}

class DeleteAllIn(BaseModel):
    confirm: bool


@router.post("/customer/delete-all")
async def delete_all(data: DeleteAllIn):
    if not data.confirm:
        raise HTTPException(status_code=422, detail="confirm must be true")
    count = len(CUSTOMERS)
    CUSTOMERS.clear()
    return {"status": "deleted", "customers_deleted": count}