def action_prevent(state: dict) -> dict:
    if not state.get("monitor_flagged"):
        state["action_taken"] = None
        state["action_detail"] = None
        state["action_output"] = {
            "summary": "No action needed. Pipeline complete.",
            "metrics": [],
            "carries_forward": "no action required",
        }
        return state

    cause = state.get("diagnosis_cause")
    diagnosis_finding = state.get("diagnosis_output", {}).get("carries_forward", "unknown")
    order_value = state.get("order_value", 0)
    compensation = 200 if order_value >= 3000 else 100

    if cause == "hub_congestion":
        action = "status_update_sms"
        detail = f"Sent proactive status update SMS explaining hub congestion delay."
        summary_sms = f"Delay 1-2 days (hub congestion) — send SMS with updated ETA to customer (₹{order_value:,})."
        metrics = [
            {"label": "Recommended Action", "value": "Status update SMS"},
            {"label": "Customer Communication", "value": "Send delay notification"},
            {"label": "Reason", "value": "Hub congestion delay"},
            {"label": "Order Value", "value": f"₹{order_value:,}"},
        ]
    elif cause == "address_verification_hold":
        action = "wallet_credit"
        detail = f"Issued ₹{compensation} wallet credit as goodwill gesture for address-verification delay."
        summary_sms = f"Address verification in progress — issue ₹{compensation} wallet credit (order ₹{order_value:,})."
        metrics = [
            {"label": "Recommended Action", "value": f"₹{compensation} wallet credit"},
            {"label": "Customer Communication", "value": "Notify address verification in progress"},
            {"label": "Reason", "value": "Address verification hold"},
            {"label": "Order Value", "value": f"₹{order_value:,}"},
        ]
    else:
        action = "status_update_sms"
        detail = f"Sent proactive status update SMS explaining weather/transit delay."
        summary_sms = f"Delay ~2 days (weather) — offer ₹{compensation} cashback to customer (₹{order_value:,})."
        metrics = [
            {"label": "Recommended Action", "value": f"₹{compensation} cashback"},
            {"label": "Customer Communication", "value": "Send delay notification"},
            {"label": "Reason", "value": "Weather-related delay"},
            {"label": "Order Value", "value": f"₹{order_value:,}"},
        ]

    state["action_taken"] = action
    state["action_detail"] = detail
    state["action_output"] = {
        "summary": summary_sms,
        "metrics": metrics,
        "carries_forward": f"action: {action} → {detail.split('.')[0].lower()}",
    }

    state.setdefault("trace", []).append({
        "agent": "action",
        "output": f"{action} — {detail}"
    })
    return state


def action_resolve(state: dict) -> dict:
    if not state.get("failure_detected"):
        state["action_taken"] = None
        state["action_detail"] = None
        state["action_output"] = {
            "summary": "No action needed.",
            "metrics": [],
            "carries_forward": "no action required",
        }
        return state

    verdict = state.get("diagnosis_verdict")
    diagnosis_finding = state.get("diagnosis_output", {}).get("carries_forward", "unknown")

    if verdict == "false_claim":
        action = "courier_invoice"
        detail = f"Courier invoiced for order {state['order_id']} — false claim on delivery attempt."
        summary_sms = f"False claim — invoice courier for order value, notify customer investigation in progress."
        metrics = [
            {"label": "Recommended Action", "value": "Courier invoiced"},
            {"label": "Customer Communication", "value": "Notify investigation in progress"},
            {"label": "Reason", "value": "False claim — no delivery attempted"},
        ]
    else:
        action = "free_reshipment"
        detail = f"Free reshipment triggered for order {state['order_id']} — genuine rejection."
        summary_sms = f"Genuine failure — trigger free reshipment, notify customer replacement dispatched."
        metrics = [
            {"label": "Recommended Action", "value": "Free reshipment"},
            {"label": "Customer Communication", "value": "Notify reshipment initiated"},
            {"label": "Reason", "value": "Genuine delivery issue"},
        ]

    state["action_taken"] = action
    state["action_detail"] = detail
    state["action_output"] = {
        "summary": summary_sms,
        "metrics": metrics,
        "carries_forward": f"action: {action}",
    }

    state.setdefault("trace", []).append({
        "agent": "action",
        "output": f"{action} — {detail}"
    })
    return state
