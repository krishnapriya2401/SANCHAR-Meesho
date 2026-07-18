from typing import TypedDict, Optional, List, Literal

class AgentTraceDict(TypedDict):
    agent: str
    output: str

class MetricDict(TypedDict):
    label: str
    value: str

class AgentOutput(TypedDict):
    summary: str
    metrics: List[MetricDict]
    carries_forward: str

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
    monitor_output: Optional[AgentOutput]

    failure_detected: Optional[bool]
    failure_type: Optional[str]

    diagnosis_cause: Optional[str]
    diagnosis_verdict: Optional[str]
    diagnosis_confidence: Optional[float]
    diagnosis_explanation: Optional[str]
    diagnosis_output: Optional[AgentOutput]

    action_taken: Optional[str]
    action_detail: Optional[str]
    action_output: Optional[AgentOutput]

    trace: List[AgentTraceDict]
