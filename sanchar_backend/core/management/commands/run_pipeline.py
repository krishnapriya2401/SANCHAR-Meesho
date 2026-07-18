import time
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

        orders = list(Order.objects.exclude(status="delivered"))
        for i, order in enumerate(orders):
            self.stdout.write(f"[{i+1}/{len(orders)}] {order.order_id} ({order.status})...")
            self.stdout.flush()
            state = order_to_state(order)
            try:
                result = graph.invoke(state)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  SKIPPED — {e}"))
                continue
            time.sleep(0.5)

            order.monitor_flagged = result.get("monitor_flagged")
            order.monitor_reason = result.get("monitor_reason")
            order.failure_type = result.get("failure_type")
            order.diagnosis_cause = result.get("diagnosis_cause")
            order.diagnosis_verdict = result.get("diagnosis_verdict")
            order.diagnosis_explanation = result.get("diagnosis_explanation")
            order.action_taken = result.get("action_taken")
            order.action_detail = result.get("action_detail")
            order.save()

            AgentTrace.objects.filter(order=order).delete()
            for entry in result.get("trace", []):
                AgentTrace.objects.create(
                    order=order,
                    agent=entry["agent"],
                    output=entry["output"],
                )

            processed += 1
            self.stdout.write(self.style.SUCCESS(f"  done — flagged={result.get('monitor_flagged')} verdict={result.get('diagnosis_verdict') or result.get('diagnosis_cause') or '-'}"))

        self.stdout.write(self.style.SUCCESS(f"Pipeline complete. Processed {processed} orders."))

        agg = run_aggregation()
        self.stdout.write(f"  Root causes: {[r['cause'] for r in agg.get('root_cause', [])]}")
        self.stdout.write(f"  Regions analyzed: {[r['region'] for r in agg.get('regional_risk', [])]}")