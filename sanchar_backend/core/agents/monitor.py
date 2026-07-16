from datetime import datetime
from django.utils import timezone
from core.models import Order, CourierBenchmark


def get_benchmark_hours(courier: str, stage: str) -> int:
    """Look up expected hours for a courier's delivery stage. Falls back to 48h if missing."""
    try:
        bm = CourierBenchmark.objects.get(courier=courier, stage=stage)
        return bm.expected_hours
    except CourierBenchmark.DoesNotExist:
        return 48


def monitor_prevent(state: dict) -> dict:
    """Mode 1: has this package been sitting at its current hub past the dwell threshold?"""
    threshold_hours = get_benchmark_hours(state["courier"], "hub_dwell_threshold")

    hub_arrival = state.get("current_hub_arrival_time")
    if hub_arrival is None:
        state["monitor_flagged"] = False
        state["monitor_reason"] = None
        state.setdefault("trace", []).append({"agent": "monitor", "output": "no hub arrival data"})
        return state

    if isinstance(hub_arrival, str):
        hub_arrival = datetime.fromisoformat(hub_arrival)

    hours_at_hub = (timezone.now() - hub_arrival).total_seconds() / 3600

    if hours_at_hub > threshold_hours:
        overage = hours_at_hub - threshold_hours
        state["monitor_flagged"] = True
        state["monitor_reason"] = (
            f"Arrived at hub {hub_arrival.strftime('%d %b, %I:%M %p')} — "
            f"stuck {overage:.0f}h past the {threshold_hours}h hub threshold"
        )
    else:
        state["monitor_flagged"] = False
        state["monitor_reason"] = None

    state.setdefault("trace", []).append({
        "agent": "monitor",
        "output": state["monitor_reason"] or "on track, within hub dwell threshold"
    })
    return state


def monitor_resolve(state: dict) -> dict:
    """Mode 2: confirm what kind of failure already happened."""
    status = state["status"]

    if status == "rto":
        state["failure_detected"] = True
        state["failure_type"] = "return_to_origin"
    elif status == "rejected":
        state["failure_detected"] = True
        state["failure_type"] = "doorstep_rejection"
    else:
        state["failure_detected"] = False
        state["failure_type"] = None

    state.setdefault("trace", []).append({
        "agent": "monitor",
        "output": state["failure_type"] or "no failure detected"
    })
    return state


def order_to_state(order: Order) -> dict:
    """Convert a Django Order model instance into a plain dict for the pipeline."""
    return {
        "order_id": order.order_id,
        "courier": order.courier,
        "pincode": order.pincode,
        "order_value": order.order_value,
        "dispatch_time": order.dispatch_time,
        "current_hub_arrival_time": order.current_hub_arrival_time,
        "deadline": order.deadline,
        "delivery_attempt_time": order.delivery_attempt_time,
        "status": order.status,
        "courier_reported_reason": order.courier_reported_reason,
        "call_log_made": order.call_log_made,
        "current_hub_arrival_time": order.current_hub_arrival_time,
        "trace": [],
    }