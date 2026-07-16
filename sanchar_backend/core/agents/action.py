def action_prevent(state: dict) -> dict:
    """Mode 1: order was flagged as stuck — decide the proactive customer-facing nudge."""
    if not state.get("monitor_flagged"):
        state["action_taken"] = None
        state["action_detail"] = None
        return state

    cause = state.get("diagnosis_cause")

    if cause == "hub_congestion":
        action = "status_update_sms"
        detail = "Sent proactive status update SMS explaining hub congestion delay."
    elif cause == "address_verification_hold":
        action = "wallet_credit"
        detail = "Issued small wallet credit as goodwill gesture for address-verification delay."
    else:  # weather_or_transit_delay, or any future cause bucket
        action = "status_update_sms"
        detail = "Sent proactive status update SMS explaining weather/transit delay."

    state["action_taken"] = action
    state["action_detail"] = detail

    state.setdefault("trace", []).append({
        "agent": "action",
        "output": f"{action} — {detail}"
    })
    return state


def action_resolve(state: dict) -> dict:
    """Mode 2: failure already happened — decide the remedy based on Diagnosis's verdict."""
    if not state.get("failure_detected"):
        state["action_taken"] = None
        state["action_detail"] = None
        return state

    verdict = state.get("diagnosis_verdict")

    if verdict == "false_claim":
        action = "courier_invoice"
        detail = f"Courier invoiced for order {state['order_id']} — false claim on delivery attempt."
    else:  # genuine
        action = "free_reshipment"
        detail = f"Free reshipment triggered for order {state['order_id']} — genuine rejection."

    state["action_taken"] = action
    state["action_detail"] = detail

    state.setdefault("trace", []).append({
        "agent": "action",
        "output": f"{action} — {detail}"
    })
    return state