from fastapi import FastAPI, Request

app = FastAPI()


@app.post("/mock/email/send")
async def send_email(request: Request):
    data = await request.json()
    return {"status": "sent", "to": data.get("to"), "message_id": "msg_123"}


@app.post("/mock/quote/create")
async def create_quote(request: Request):
    data = await request.json()
    return {"status": "created", "quote_id": "Q-1001", "amount": data.get("amount")}