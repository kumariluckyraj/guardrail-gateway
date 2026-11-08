import asyncio
import json
import logging
import time
import groq
from datetime import datetime, timezone
from typing import Annotated, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from app import gateway_client
from app.config import settings
from app.tools import TOOL_SPECS

logger = logging.getLogger("sales-agent")

SYSTEM_PROMPT = """You are a sales operations assistant. Carry out the user's task with the tools provided.

Rules:
- Look up a customer with lookup_customer before using their id or email. Never invent ids or addresses.
- Only do what the task asks. Amounts are in INR.
- If a tool result says denied, rate_limited, rejected, expired, pending_approval or error, do NOT try to
  work around it with other tools or by retrying. Stop and report it honestly.
- When finished, reply with a short summary of what was done and what was not done, and why."""

llm = ChatGroq(
    model=settings.groq_model,
    api_key=settings.groq_api_key,
    temperature=0,
    max_retries=3,
).bind_tools(TOOL_SPECS)


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]


def _log(run: dict, type_: str, **fields) -> None:
    run["steps"].append({"t": datetime.now(timezone.utc).isoformat(), "type": type_, **fields})


def _text(content) -> str:
    if isinstance(content, str):
        return content
    return " ".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in content)


# ---------- gateway outcomes -> something the LLM can understand ----------

async def _wait_for_approval(run: dict, tool: str, args: dict, approval_id: str, request_id: str) -> dict:
    deadline = time.monotonic() + settings.approval_wait_seconds
    while time.monotonic() < deadline:
        await asyncio.sleep(settings.approval_poll_seconds)
        status, body = await gateway_client.poll_approval(approval_id)
        if status == 404:
            break
        if status != 200:
            continue
        state = body.get("status")
        if state == "executed":  # a human approved, so now we run it
            code, result = await gateway_client.run_local(tool, args, request_id)
            if 200 <= code < 300:
                _log(run, "tool_result", tool=tool, decision="approved_executed", approval_id=approval_id)
                return {"status": "success", "approved_by_human": True, "result": result}
            _log(run, "tool_result", tool=tool, decision="approved_failed", approval_id=approval_id,
                 detail=str(result.get("detail"))[:200])
            return {"status": "error", "message": "Approved by a human, but the action failed.",
                    "details": result}
        if state == "rejected":
            _log(run, "tool_result", tool=tool, decision="rejected", approval_id=approval_id,
                 detail=body.get("rejection_reason"))
            return {"status": "rejected", "message": "A human reviewer rejected this action.",
                    "reviewer_reason": body.get("rejection_reason")}
        if state in ("expired", "failed"):
            _log(run, "tool_result", tool=tool, decision="expired", approval_id=approval_id)
            return {"status": "expired", "message": "The approval request expired."}

    _log(run, "tool_result", tool=tool, decision="pending_approval_timeout", approval_id=approval_id)
    return {"status": "pending_approval",
            "message": "Still waiting for human approval. Do not retry. Tell the user it is awaiting approval."}

async def _run_tool(run: dict, call: dict) -> dict:
    name, args = call["name"], call.get("args") or {}
    status, body = await gateway_client.check(name, args, f"{run['id']}:{call['id']}")

    if status == 200:  # allowed: now we run it ourselves
        code, result = await gateway_client.run_local(name, args, body.get("request_id", ""))
        if 200 <= code < 300:
            _log(run, "tool_result", tool=name, decision="allowed", http_status=200)
            return {"status": "success", "result": result}
        _log(run, "tool_result", tool=name, decision="error", http_status=code,
             detail=str(result.get("detail"))[:200])
        return {"status": "error", "message": "The action failed.", "details": result}

    if status == 202:
        approval_id = body.get("approval_id", "")
        _log(run, "waiting_approval", tool=name, approval_id=approval_id, detail=body.get("reason"))
        return await _wait_for_approval(run, name, args, approval_id, body.get("request_id", ""))

    if status == 403:
        _log(run, "tool_result", tool=name, decision="denied", http_status=403, detail=body.get("reason"))
        return {"status": "denied", "message": "The gateway denied this action. This agent is not permitted to do it."}

    if status == 429:
        _log(run, "tool_result", tool=name, decision="rate_limited", http_status=429,
             detail=body.get("reason"))
        return {"status": "rate_limited", "message": body.get("reason"),
                "retry_after_seconds": body.get("retry_after_seconds")}

    _log(run, "tool_result", tool=name, decision="error", http_status=status,
         detail=str(body.get("detail") or body.get("reason"))[:200])
    return {"status": "error", "message": "The gateway could not process the request."}

# ---------- graph nodes ----------



async def _ask_llm(messages):
    for attempt in range(3):
        try:
            return await llm.ainvoke(messages)
        except groq.BadRequestError as e:
            if "output_parse_failed" in str(e) and attempt < 2:
                await asyncio.sleep(1)
                continue
            raise

async def agent_node(state: AgentState, config: RunnableConfig):
    run = config["configurable"]["run"]
    msg = await _ask_llm([SystemMessage(content=SYSTEM_PROMPT)] + state["messages"])
    text = _text(msg.content).strip()
    if text and msg.tool_calls:
        _log(run, "thought", text=text[:1000])
    for tc in msg.tool_calls:
        _log(run, "tool_request", tool=tc["name"], arguments=tc.get("args") or {})
    return {"messages": [msg]}


async def tools_node(state: AgentState, config: RunnableConfig):
    run = config["configurable"]["run"]
    out = []
    for call in state["messages"][-1].tool_calls:
        run["tool_calls"] += 1
        if run["tool_calls"] > settings.max_tool_calls:
            outcome = {"status": "error", "message": "Tool call budget used up. Give your final answer now."}
            _log(run, "tool_result", tool=call["name"], decision="budget_exhausted")
        else:
            outcome = await _run_tool(run, call)
        out.append(ToolMessage(content=json.dumps(outcome, default=str),
                               tool_call_id=call["id"], name=call["name"]))
    return {"messages": out}


def route(state: AgentState):
    return "tools" if getattr(state["messages"][-1], "tool_calls", None) else END


_builder = StateGraph(AgentState)
_builder.add_node("agent", agent_node)
_builder.add_node("tools", tools_node)
_builder.add_edge(START, "agent")
_builder.add_conditional_edges("agent", route, {"tools": "tools", END: END})
_builder.add_edge("tools", "agent")
graph = _builder.compile()


async def execute_run(run: dict) -> None:
    run["status"] = "running"
    try:
        result = await graph.ainvoke(
            {"messages": [HumanMessage(content=run["task"])]},
            config={"configurable": {"run": run}, "recursion_limit": 40},
        )
        final = _text(result["messages"][-1].content).strip()
        run["final_answer"] = final
        _log(run, "final", text=final)
        run["status"] = "completed"
    except Exception as e:
        logger.exception("run %s failed", run["id"])
        run["status"] = "failed"
        run["error"] = f"{type(e).__name__}: {str(e)[:200]}"
        _log(run, "error", text=run["error"])
    finally:
        run["finished_at"] = datetime.now(timezone.utc).isoformat()