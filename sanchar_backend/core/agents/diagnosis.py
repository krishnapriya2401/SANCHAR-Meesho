from core.agents.groq_client import ask_groq_json

CONGESTION_PINCODES = {"641001", "641002", "641037"}

CAUSE_META = {
    "hub_congestion": {
        "label": "Hub Congestion",
        "impact": "Hub-level",
        "summary_template": "Hub congestion from order surge — hub-level operational issue, not agent performance.",
    },
    "address_verification_hold": {
        "label": "Address Verification Hold",
        "impact": "Order-level",
        "summary_template": "High-value order triggered address verification — order-specific hold, not hub-wide.",
    },
    "weather_or_transit_delay": {
        "label": "Weather Disruption",
        "impact": "Hub-level",
        "summary_template": "Heavy rainfall reduced road visibility — hub-level weather disruption, not agent performance.",
    },
}

VERDICT_META = {
    "false_claim": {
        "label": "False Claim",
        "impact": "Courier-level",
        "summary_template": "Courier claimed 'customer unavailable' but no call log — evidence mismatch, delivery likely not attempted.",
    },
    "genuine": {
        "label": "Genuine Issue",
        "impact": "Order-level",
        "summary_template": "Courier report matches call log evidence — delivery failure is legitimate.",
    },
}


def diagnosis_prevent(state: dict) -> dict:
    if not state.get("monitor_flagged"):
        state["diagnosis_cause"] = None
        state["diagnosis_explanation"] = None
        state["diagnosis_output"] = {
            "summary": "No issue detected. Nothing to diagnose.",
            "metrics": [],
            "carries_forward": "no diagnosis needed",
        }
        return state

    pincode = state["pincode"]
    if pincode in CONGESTION_PINCODES:
        cause = "hub_congestion"
    elif state["order_value"] > 3000:
        cause = "address_verification_hold"
    else:
        cause = "weather_or_transit_delay"

    state["diagnosis_cause"] = cause
    meta = CAUSE_META[cause]
    carries_from_monitor = state.get("monitor_output", {}).get("carries_forward", "unknown")

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
            f"monitor finding: {carries_from_monitor}."
        ),
        fallback=fallback,
    )
    state["diagnosis_explanation"] = result.get("explanation", fallback["explanation"])

    summary = f"{meta['summary_template']} {state['diagnosis_explanation']}"
    state["diagnosis_output"] = {
        "summary": summary,
        "metrics": [
            {"label": "Root Cause", "value": meta["label"]},
            {"label": "Impact", "value": meta["impact"]},
        ],
        "carries_forward": f"cause: {meta['label'].lower()}",
    }

    state.setdefault("trace", []).append({
        "agent": "diagnosis",
        "output": f"{cause} — {state['diagnosis_explanation']}"
    })
    return state


def diagnosis_resolve(state: dict) -> dict:
    if not state.get("failure_detected"):
        state["diagnosis_verdict"] = None
        state["diagnosis_explanation"] = None
        state["diagnosis_output"] = {
            "summary": "No failure detected. Nothing to diagnose.",
            "metrics": [],
            "carries_forward": "no diagnosis needed",
        }
        return state

    reported_reason = state["courier_reported_reason"]
    call_logged = state["call_log_made"]

    if reported_reason == "customer_unavailable" and not call_logged:
        verdict = "false_claim"
    else:
        verdict = "genuine"

    state["diagnosis_verdict"] = verdict
    meta = VERDICT_META[verdict]
    carries_from_monitor = state.get("monitor_output", {}).get("carries_forward", "unknown")

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
            f"verdict: {verdict}, monitor finding: {carries_from_monitor}."
        ),
        fallback=fallback,
    )
    state["diagnosis_explanation"] = result.get("explanation", fallback["explanation"])

    summary = f"{meta['summary_template']} {state['diagnosis_explanation']}"
    state["diagnosis_output"] = {
        "summary": summary,
        "metrics": [
            {"label": "Verdict", "value": meta["label"]},
            {"label": "Impact", "value": meta["impact"]},
        ],
        "carries_forward": f"verdict: {verdict} → {state['diagnosis_explanation']}",
    }

    state.setdefault("trace", []).append({
        "agent": "diagnosis",
        "output": f"{verdict} — {state['diagnosis_explanation']}"
    })
    return state
