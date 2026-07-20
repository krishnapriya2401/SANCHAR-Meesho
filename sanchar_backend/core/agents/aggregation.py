import pandas as pd
from django.utils import timezone
from django.core.cache import cache
from core.models import Order
from core.agents.groq_client import ask_groq_json
from core.agents.monitor import get_reference_time

PINCODE_TO_REGION = {
    "600001": "Chennai", "641001": "Coimbatore", "560001": "Bengaluru",
    "700001": "Kolkata", "110001": "Delhi", "500001": "Hyderabad",
}

ACTION_COST_ESTIMATE = {
    "status_update_sms": 0,
    "wallet_credit": -150,
    "free_reshipment": -50,
}


def _root_cause_breakdown():
    orders = Order.objects.filter(
        diagnosis_cause__isnull=False, status="in_transit"
    ).values("diagnosis_cause", "order_id")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return []
    counts = df["diagnosis_cause"].value_counts()
    total = counts.sum()
    return [
        {"cause": cause.replace("_", " ").title(), "count": int(c), "pct": round(c / total * 100, 1)}
        for cause, c in counts.items()
    ]


def _regional_risk():
    orders = Order.objects.filter(
        diagnosis_cause__isnull=False, status="in_transit"
    ).values("diagnosis_cause", "pincode")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return []
    df["region"] = df["pincode"].map(PINCODE_TO_REGION).fillna("Other")
    pivot = df.groupby(["region", "diagnosis_cause"]).size().unstack(fill_value=0)
    result = []
    for region, row in pivot.iterrows():
        entry = {"region": region}
        entry.update({cause.replace("_", " ").title(): int(row.get(cause, 0)) for cause in pivot.columns})
        result.append(entry)
    return result


def _delay_distribution():
    now = get_reference_time()
    orders = Order.objects.filter(
        monitor_flagged=True, current_hub_arrival_time__isnull=False
    ).values("current_hub_arrival_time")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return {"avg_hours": 0, "median_hours": 0, "p95_hours": 0, "histogram": []}
    df["hours"] = df["current_hub_arrival_time"].apply(lambda t: (now - t).total_seconds() / 3600)
    hours = df["hours"]
    buckets = [0, 6, 12, 24, 48, 96, float("inf")]
    labels = ["0-6h", "6-12h", "12-24h", "24-48h", "48-96h", "96h+"]
    hist = []
    for i in range(len(buckets) - 1):
        lo, hi = buckets[i], buckets[i + 1]
        count = int(((hours >= lo) & (hours < hi)).sum())
        if count:
            hist.append({"range": labels[i], "count": count})
    return {
        "avg_hours": round(hours.mean(), 1),
        "median_hours": round(hours.median(), 1),
        "p95_hours": round(hours.quantile(0.95), 1),
        "histogram": hist,
    }


def _value_correlation():
    orders = Order.objects.filter(
        diagnosis_cause__isnull=False, status="in_transit"
    ).values("diagnosis_cause", "order_value")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return []
    df["tier"] = df["order_value"].apply(lambda v: "High (>₹3,000)" if v > 3000 else "Low (≤₹3,000)")
    pivot = df.groupby(["tier", "diagnosis_cause"]).size().unstack(fill_value=0)
    result = []
    for tier, row in pivot.iterrows():
        entry = {"tier": tier}
        entry.update({cause.replace("_", " ").title(): int(row.get(cause, 0)) for cause in pivot.columns})
        result.append(entry)
    return result


def _action_financial_impact():
    orders = Order.objects.filter(
        action_taken__isnull=False
    ).exclude(status="delivered").values("action_taken", "order_value")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return {"actions": [], "total_cost": 0}

    result = []
    total_cost = 0

    for action in df["action_taken"].unique():
        subset = df[df["action_taken"] == action]
        label = action.replace("_", " ").title()
        count = len(subset)

        if action == "courier_invoice":
            financial = subset["order_value"].sum()
        else:
            unit_cost = ACTION_COST_ESTIMATE.get(action, 0)
            financial = unit_cost * count

        total_cost += financial
        result.append({
            "action": label,
            "count": count,
            "financial_impact": int(financial),
        })

    return {"actions": result, "total_cost": int(total_cost)}


def _false_claim_rate():
    orders = Order.objects.filter(
        status__in=["rejected", "rto"], diagnosis_verdict__isnull=False
    ).values("diagnosis_verdict", "pincode")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return {"total_resolved": 0, "false_claims": 0, "false_claim_pct": 0, "by_region": []}
    total = len(df)
    false_claims = int((df["diagnosis_verdict"] == "false_claim").sum())
    df["region"] = df["pincode"].map(PINCODE_TO_REGION).fillna("Other")
    region_groups = df.groupby("region")["diagnosis_verdict"].apply(list).to_dict()
    by_region = []
    for region, verdicts in region_groups.items():
        r_total = len(verdicts)
        r_false = sum(1 for v in verdicts if v == "false_claim")
        by_region.append({
            "region": region,
            "total": r_total,
            "false_claims": r_false,
            "pct": round(r_false / r_total * 100, 1) if r_total else 0,
        })
    return {
        "total_resolved": total,
        "false_claims": false_claims,
        "false_claim_pct": round(false_claims / total * 100, 1) if total else 0,
        "by_region": by_region,
    }


def _savings_over_time():
    orders = Order.objects.filter(
        action_taken__isnull=False
    ).exclude(status="delivered").values("action_taken", "order_value", "dispatch_time").order_by("dispatch_time")
    df = pd.DataFrame(list(orders))
    if df.empty:
        return []
    savings_map = {"courier_invoice": 1, "free_reshipment": -50, "wallet_credit": -150, "status_update_sms": 0}
    df["savings"] = df.apply(
        lambda r: r["order_value"] if r["action_taken"] == "courier_invoice" else savings_map.get(r["action_taken"], 0),
        axis=1
    )
    df["date"] = df["dispatch_time"].dt.strftime("%d %b")
    daily = df.groupby("date")["savings"].sum().reset_index()
    daily["cumulative"] = daily["savings"].cumsum()
    return daily.to_dict(orient="records")


def _executive_summary(insights: dict) -> str:
    cache_key = "aggregation_executive_summary"
    cached = cache.get(cache_key)
    if cached:
        return cached

    prompt_parts = []
    rc = insights.get("root_cause", [])
    if rc:
        prompt_parts.append("Root causes: " + ", ".join(f"{r['cause']} {r['pct']}%" for r in rc))
    dd = insights.get("delay_distribution", {})
    if dd.get("avg_hours"):
        prompt_parts.append(f"Avg delay {dd['avg_hours']}h, median {dd['median_hours']}h, P95 {dd['p95_hours']}h")
    fc = insights.get("false_claim_rate", {})
    if fc.get("total_resolved"):
        prompt_parts.append(f"Resolved {fc['total_resolved']} disputes, {fc['false_claim_pct']}% false claims")
    af = insights.get("action_financial", {})
    if af.get("total_cost"):
        prompt_parts.append(f"Total financial impact ₹{af['total_cost']:,}")

    if not prompt_parts:
        return "No data to summarize."

    prompt_text = ". ".join(prompt_parts) + "."
    fallback = {"summary": "Batch processed. " + prompt_text}
    result = ask_groq_json(
        system_prompt=(
            "You are an operations analyst. Given batch statistics, write 3 concise bullet points "
            "(max 15 words each) summarizing key findings. Use plain English, no jargon. "
            "Respond ONLY with JSON: {\"summary\": \"...\"}. No markdown."
        ),
        user_prompt=prompt_text,
        fallback=fallback,
        timeout=10.0,
    )
    raw = result.get("summary", fallback["summary"])
    if isinstance(raw, list):
        raw = "\n".join(f"\u2022 {line}" for line in raw)

    cache.set(cache_key, raw, 600)
    return raw


def run_aggregation() -> dict:
    insights = {
        "root_cause": _root_cause_breakdown(),
        "regional_risk": _regional_risk(),
        "delay_distribution": _delay_distribution(),
        "value_correlation": _value_correlation(),
        "action_financial": _action_financial_impact(),
        "false_claim_rate": _false_claim_rate(),
        "savings_over_time": _savings_over_time(),
    }
    insights["executive_summary"] = _executive_summary(insights)
    return insights
