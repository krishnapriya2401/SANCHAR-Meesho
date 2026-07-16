from langgraph.graph import StateGraph, END
from core.agents.state import SancharState
from core.agents.monitor import monitor_prevent, monitor_resolve
from core.agents.diagnosis import diagnosis_prevent, diagnosis_resolve
from core.agents.action import action_prevent, action_resolve


def _route_by_status(state: SancharState) -> str:
    """Router node: Mode 1 (Prevent) for in_transit, Mode 2 (Resolve) for rejected/rto, skip delivered."""
    if state["status"] == "in_transit":
        return "prevent"
    elif state["status"] in ("rejected", "rto"):
        return "resolve"
    else:
        return "skip"  # delivered orders — nothing for the pipeline to do


def build_graph():
    graph = StateGraph(SancharState)

    graph.add_node("monitor_prevent", monitor_prevent)
    graph.add_node("diagnosis_prevent", diagnosis_prevent)
    graph.add_node("action_prevent", action_prevent)

    graph.add_node("monitor_resolve", monitor_resolve)
    graph.add_node("diagnosis_resolve", diagnosis_resolve)
    graph.add_node("action_resolve", action_resolve)

    graph.set_conditional_entry_point(
        _route_by_status,
        {
            "prevent": "monitor_prevent",
            "resolve": "monitor_resolve",
            "skip": END,
        },
    )

    graph.add_edge("monitor_prevent", "diagnosis_prevent")
    graph.add_edge("diagnosis_prevent", "action_prevent")
    graph.add_edge("action_prevent", END)

    graph.add_edge("monitor_resolve", "diagnosis_resolve")
    graph.add_edge("diagnosis_resolve", "action_resolve")
    graph.add_edge("action_resolve", END)

    return graph.compile()