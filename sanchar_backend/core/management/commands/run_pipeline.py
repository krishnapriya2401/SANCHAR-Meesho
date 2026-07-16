from django.core.management.base import BaseCommand
from core.models import Order, AgentTrace
from core.agents.monitor import order_to_state
from core.agents.graph import build_graph
from core.agents.aggregation import run_aggregation


class Command(BaseCommand):
    help = "Run the full Sanchar LangGraph pipeline across all orders, both modes, then aggregate"

    def handle(self, *args, **options):
        graph = build_graph()
        processed = 0

        for order in Order.objects.exclude(status="delivered"):
            state = order_to_state(order)
            result = graph.invoke(state)

            order.monitor_flagged = result.get("monitor_flagged")
            order.monitor_reason = result.get("monitor_reason")
            order.failure_type = result.get("failure_type")
            order.diagnosis_cause = result.get("diagnosis_cause")
            order.diagnosis_verdict = result.get("diagnosis_verdict")
            order.diagnosis_explanation = result.get("diagnosis_explanation")
            order.action_taken = result.get("action_taken")
            order.action_detail = result.get("action_detail")
            order.save()

            # persist trace for the frontend Order Detail view (Day 5)
            AgentTrace.objects.filter(order=order).delete()
            for entry in result.get("trace", []):
                AgentTrace.objects.create(
                    order=order,
                    agent=entry["agent"],
                    output=entry["output"],
                )

            processed += 1

        self.stdout.write(self.style.SUCCESS(f"Pipeline complete. Processed {processed} orders."))

        agg = run_aggregation()
        self.stdout.write(f"  Couriers scored: {len(agg['scorecard'])}")
        self.stdout.write(f"  Flagged for human review: {agg['flagged_couriers']}")