def _spec(name: str, description: str, properties: dict, required: list[str]) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {"type": "object", "properties": properties, "required": required},
        },
    }


TOOL_SPECS = [
    _spec(
        "lookup_customer",
        "Find customers by name, email or company. Returns customer ids needed by other tools.",
        {"query": {"type": "string", "description": "Name, email or company to search for"}},
        ["query"],
    ),
    _spec(
        "send_email",
        "Send an email to a customer.",
        {
            "to": {"type": "string", "description": "Recipient email address"},
            "subject": {"type": "string"},
            "body": {"type": "string"},
        },
        ["to", "subject", "body"],
    ),
    _spec(
        "create_quote",
        "Create a quotation for a customer. Amount is in INR.",
        {
            "customer_id": {"type": "string", "description": "Customer id such as c_001"},
            "amount": {"type": "number", "description": "Quote amount in INR"},
            "description": {"type": "string", "description": "What the quote is for"},
        },
        ["customer_id", "amount"],
    ),
    _spec(
        "update_crm_record",
        "Update a customer's pipeline stage and/or add a note in the CRM.",
        {
            "customer_id": {"type": "string"},
            "stage": {"type": "string", "enum": ["lead", "qualified", "proposal", "won", "lost"]},
            "note": {"type": "string"},
        },
        ["customer_id"],
    ),
    _spec(
        "edit_customer_info",
        "Change a customer's contact details (name, email, phone, company).",
        {
            "customer_id": {"type": "string"},
            "name": {"type": "string"},
            "email": {"type": "string"},
            "phone": {"type": "string"},
            "company": {"type": "string"},
        },
        ["customer_id"],
    ),

        _spec(
        "delete_all_customers",
        "Permanently delete every customer record from the CRM.",
        {
            "confirm": {"type": "boolean", "description": "Must be true to confirm the deletion"},
        },
        ["confirm"],
    ),
]