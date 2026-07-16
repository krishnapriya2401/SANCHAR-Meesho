import pandas as pd
from core.models import Order

PINCODE_TO_REGION = {
    "600001": "Chennai",
    "641001": "Coimbatore",
    "560001": "Bengaluru",
    "700001": "Kolkata",
    "110001": "Delhi",
    "500001": "Hyderabad",
}

FAULT_RATE_FLAG_THRESHOLD = 40.0  # % — above this, courier gets flagged for human review


def run_aggregation() -> dict:
    """
    Non-LLM. Studies verdicts across ALL resolved orders (rejected/rto) at once — this is
    Sanchar's differentiator vs. per-order-only agent systems. Produces a per-courier fault-rate
    scorecard (for the recharts bar chart), a region-level breakdown (for the detail table), and
    a list of couriers whose fault rate crosses the threshold (for the human-approval control).
    Does not touch in_transit or delivered orders — only orders Diagnosis has already verdicted.
    """
    orders = Order.objects.filter(
        status__in=["rejected", "rto"],
        diagnosis_verdict__isnull=False,
    ).values("courier", "pincode", "diagnosis_verdict", "order_value")

    df = pd.DataFrame(list(orders))

    if df.empty:
        return {"scorecard": [], "detail_by_region": [], "flagged_couriers": []}

    df["region"] = df["pincode"].map(PINCODE_TO_REGION).fillna("Other")
    df["is_false_claim"] = df["diagnosis_verdict"] == "false_claim"

    # courier-level scorecard — feeds the bar chart
    scorecard = df.groupby("courier").agg(
        total_orders=("diagnosis_verdict", "count"),
        false_claims=("is_false_claim", "sum"),
    ).reset_index()
    scorecard["fault_rate_pct"] = (scorecard["false_claims"] / scorecard["total_orders"] * 100).round(1)

    # courier x region breakdown — feeds the detail table
    detail = df.groupby(["courier", "region"]).agg(
        total_orders=("diagnosis_verdict", "count"),
        false_claims=("is_false_claim", "sum"),
    ).reset_index()
    detail["fault_rate_pct"] = (detail["false_claims"] / detail["total_orders"] * 100).round(1)

    flagged = scorecard[scorecard["fault_rate_pct"] > FAULT_RATE_FLAG_THRESHOLD]["courier"].tolist()

    return {
        "scorecard": scorecard.to_dict(orient="records"),
        "detail_by_region": detail.to_dict(orient="records"),
        "flagged_couriers": flagged,  # judges' "Human Approves" control acts on this list
    }