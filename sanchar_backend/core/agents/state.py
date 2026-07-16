from typing import TypedDict, Optional, List, Literal

class AgentTraceDict(TypedDict):
    agent: str
    output: str

class SancharState(TypedDict):
    order_id: str
    courier: str
    pincode: str
    order_value: int
    dispatch_time: str
    current_hub_arrival_time: Optional[str]
    deadline: str
    delivery_attempt_time: Optional[str]
    status: str
    courier_reported_reason: Optional[str]
    call_log_made: Optional[bool]

    mode: Optional[Literal["prevent", "resolve", "no_action"]]

    monitor_flagged: Optional[bool]
    monitor_reason: Optional[str]

    failure_detected: Optional[bool]
    failure_type: Optional[str]

    diagnosis_cause: Optional[str]            # added — Mode 1 output
    diagnosis_verdict: Optional[str]          # Mode 2 output
    diagnosis_confidence: Optional[float]     # currently unused, kept for future
    diagnosis_explanation: Optional[str]

    action_taken: Optional[str]
    action_detail: Optional[str]              # added — action.py sets this

    trace: List[AgentTraceDict]