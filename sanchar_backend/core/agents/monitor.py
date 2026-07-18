from datetime import datetime
from django.utils import timezone
from core.models import Order, CourierBenchmark, PipelineClock

PINCODE_TO_HUB = {
    "600001": "Chennai Central Hub",
    "641001": "Coimbatore Hub",
    "560001": "Bengaluru Hub",
    "700001": "Kolkata Hub",
    "110001": "Delhi Hub",
    "500001": "Hyderabad Hub",
}


def get_reference_time():
    clock = PipelineClock.objects.first()
    return clock.reference_time if clock else timezone.now()


def get_benchmark_hours(courier: str, stage: str) -> int:
    try:
        bm = CourierBenchmark.objects.get(courier=courier, stage=stage)
        return bm.expected_hours
    except CourierBenchmark.DoesNotExist:
        return 48


def _build_monitor_output_prevent(state: dict) -> dict:
    hub_arrival = state.get("current_hub_arrival_time")
    if isinstance(hub_arrival, str):
        hub_arrival = datetime.fromisoformat(hub_arrival)

    hours_at_hub = (get_reference_time() - hub_arrival).total_seconds() / 3600
    hub_name = PINCODE_TO_HUB.get(state["pincode"], f"Hub ({state['pincode']})")
    threshold_hours = get_benchmark_hours(state["courier"], "hub_dwell_threshold")

    overage_hours = hours_at_hub - threshold_hours
    h_total = int(hours_at_hub)
    m_total = int((hours_at_hub % 1) * 60)
    h_over = int(overage_hours)
    m_over = int((overage_hours % 1) * 60)
    arrival_fmt = hub_arrival.strftime('%I:%M %p')
    date_fmt = hub_arrival.strftime('%d %b')

    summary = f"Prolonged stall at {hub_name} — {h_over}h {m_over}m past threshold. Multiple orders affected."

    metrics = [
        {"label": "Time at current hub", "value": f"{h_total}h {m_total}m"},
        {"label": "Current hub", "value": hub_name},
        {"label": "Last scan", "value": arrival_fmt},
        {"label": "Expected movement", "value": f"{threshold_hours}h threshold"},
        {"label": "Status updates missed", "value": "3"},
    ]

    carries_forward = f"hub: {hub_name} \u2192 stuck {h_over}h {m_over}m past {threshold_hours}h threshold"

    return {"summary": summary, "metrics": metrics, "carries_forward": carries_forward}


def _build_monitor_output_resolve(state: dict) -> dict:
    failure_type = state.get("failure_type")
    if not failure_type:
        return {
            "summary": "No failure detected. Monitoring is clear.",
            "metrics": [],
            "carries_forward": "no failure detected",
        }

    summary_map = {
        "return_to_origin": "Package is being returned to origin. The delivery attempt was marked as RTO by the courier partner.",
        "doorstep_rejection": "Delivery was rejected at the doorstep. The recipient refused to accept the package at the time of delivery.",
    }
    metrics_map = {
        "return_to_origin": [
            {"label": "Failure Type", "value": "Return to Origin"},
            {"label": "Action Required", "value": "Reshipment or refund"},
        ],
        "doorstep_rejection": [
            {"label": "Failure Type", "value": "Doorstep Rejection"},
            {"label": "Action Required", "value": "Contact customer"},
        ],
    }

    summary = summary_map.get(failure_type, f"Failure detected: {failure_type}")
    metrics = metrics_map.get(failure_type, [])
    carries_forward = f"failure: {failure_type}"

    return {"summary": summary, "metrics": metrics, "carries_forward": carries_forward}


def monitor_prevent(state: dict) -> dict:
    threshold_hours = get_benchmark_hours(state["courier"], "hub_dwell_threshold")

    hub_arrival = state.get("current_hub_arrival_time")
    if hub_arrival is None:
        state["monitor_flagged"] = False
        state["monitor_reason"] = None
        state["monitor_output"] = {
            "summary": "No hub arrival data available. Monitoring could not assess the package.",
            "metrics": [],
            "carries_forward": "no data",
        }
        state.setdefault("trace", []).append({"agent": "monitor", "output": "no hub arrival data"})
        return state

    if isinstance(hub_arrival, str):
        hub_arrival = datetime.fromisoformat(hub_arrival)

    hours_at_hub = (get_reference_time() - hub_arrival).total_seconds() / 3600

    if hours_at_hub > threshold_hours:
        overage = hours_at_hub - threshold_hours
        state["monitor_flagged"] = True
        state["monitor_reason"] = (
            f"Arrived at hub {hub_arrival.strftime('%d %b, %I:%M %p')} — "
            f"stuck {overage:.0f}h past the {threshold_hours}h hub threshold"
        )
        state["monitor_output"] = _build_monitor_output_prevent(state)
    else:
        state["monitor_flagged"] = False
        state["monitor_reason"] = None
        state["monitor_output"] = {
            "summary": "All clear. Package is within expected hub dwell time.",
            "metrics": [
                {"label": "Time at hub", "value": f"{int(hours_at_hub)}h {int((hours_at_hub % 1) * 60)}m"},
                {"label": "Threshold", "value": f"{threshold_hours}h"},
            ],
            "carries_forward": "on track, within threshold",
        }

    state.setdefault("trace", []).append({
        "agent": "monitor",
        "output": state["monitor_reason"] or "on track, within hub dwell threshold"
    })
    return state


def monitor_resolve(state: dict) -> dict:
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

    state["monitor_output"] = _build_monitor_output_resolve(state)

    state.setdefault("trace", []).append({
        "agent": "monitor",
        "output": state["failure_type"] or "no failure detected"
    })
    return state


def order_to_state(order: Order) -> dict:
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
        "trace": [],
    }
