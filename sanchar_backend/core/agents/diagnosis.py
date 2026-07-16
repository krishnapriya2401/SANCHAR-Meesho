from core.agents.groq_client import ask_groq_json

# Deterministic cause buckets for Mode 1 — no ambiguity needed, courier/pincode patterns
# are enough to categorize. LLM only writes the sentence on top of whichever bucket wins.
CONGESTION_PINCODES = {"641001", "641002", "641037"}  # dense urban pincodes in synthetic data


def diagnosis_prevent(state: dict) -> dict:
    """Mode 1: why is this stuck order actually stuck, and what should we tell the customer?"""
    if not state.get("monitor_flagged"):
        state["diagnosis_cause"] = None
        state["diagnosis_explanation"] = None
        return state

    # --- deterministic cause bucket (never LLM-decided) ---
    pincode = state["pincode"]
    if pincode in CONGESTION_PINCODES:
        cause = "hub_congestion"
    elif state["order_value"] > 3000:
        cause = "address_verification_hold"
    else:
        cause = "weather_or_transit_delay"

    state["diagnosis_cause"] = cause

    # --- LLM writes the explanation only ---
    fallback = {
        "explanation": f"Shipment delayed due to {cause.replace('_', ' ')}. Monitoring for further updates."
    }
    result = ask_groq_json(
        system_prompt=(
            "You are Sanchar's Diagnosis Agent. Given a delayed delivery's cause category, "
            "write ONE short, calm, customer-facing sentence (max 25 words) explaining the delay. "
            "Respond ONLY with JSON: {\"explanation\": \"...\"}. No markdown, no preamble."
        ),
        user_prompt=(
            f"Order {state['order_id']}, courier {state['courier']}, cause category: {cause}, "
            f"reason detail: {state['monitor_reason']}."
        ),
        fallback=fallback,
    )
    state["diagnosis_explanation"] = result.get("explanation", fallback["explanation"])

    state.setdefault("trace", []).append({
        "agent": "diagnosis",
        "output": f"{cause} — {state['diagnosis_explanation']}"
    })
    return state


def diagnosis_resolve(state: dict) -> dict:
    """Mode 2: cross-check courier's claim against call log. THE fraud-detection core loop."""
    if not state.get("failure_detected"):
        state["diagnosis_verdict"] = None
        state["diagnosis_explanation"] = None
        return state

    reported_reason = state["courier_reported_reason"]
    call_logged = state["call_log_made"]

    # --- deterministic fraud verdict (never LLM-decided) ---
    if reported_reason == "customer_unavailable" and not call_logged:
        verdict = "false_claim"
    else:
        verdict = "genuine"

    state["diagnosis_verdict"] = verdict

    # --- LLM writes the explanation only ---
    fallback = {
        "explanation": (
            f"Courier reported '{reported_reason}' with no call log on record — flagged as a "
            "false claim pending courier response."
            if verdict == "false_claim"
            else f"Courier reported '{reported_reason}', consistent with call log — verdict genuine."
        )
    }
    result = ask_groq_json(
        system_prompt=(
            "You are Sanchar's Diagnosis Agent investigating a failed COD delivery. Given the "
            "courier's stated reason, whether a call log exists, and the verdict already reached, "
            "write ONE short, neutral, audit-style sentence (max 25 words) explaining the finding "
            "for a case file. Respond ONLY with JSON: {\"explanation\": \"...\"}. No markdown."
        ),
        user_prompt=(
            f"Order {state['order_id']}, failure type: {state['failure_type']}, "
            f"courier reported reason: '{reported_reason}', call_log_made: {call_logged}, "
            f"verdict: {verdict}."
        ),
        fallback=fallback,
    )
    state["diagnosis_explanation"] = result.get("explanation", fallback["explanation"])

    state.setdefault("trace", []).append({
        "agent": "diagnosis",
        "output": f"{verdict} — {state['diagnosis_explanation']}"
    })
    return state