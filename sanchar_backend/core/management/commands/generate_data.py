import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from core.models import Order, CourierBenchmark

COURIERS = ["DelhiveryX", "ShreeMaruti", "Ekart", "XpressBees", "BlueDart"]
PINCODES = ["600001", "641001", "560001", "700001", "110001", "500001"]

COURIER_FALSE_CLAIM_BIAS = {
    "BlueDart": 0.10,
    "DelhiveryX": 0.15,
    "ShreeMaruti": 0.20,
    "XpressBees": 0.25,
    "Ekart": 0.45,
}


class Command(BaseCommand):
    help = "Generate synthetic Sanchar order data"

    def add_arguments(self, parser):
        parser.add_argument("--n", type=int, default=180)

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("RUNNING BIAS VERSION"))
        n = options["n"]

        Order.objects.all().delete()
        CourierBenchmark.objects.all().delete()

        benchmarks = {}
        for c in COURIERS:
            pickup_hours = random.choice([12, 18, 24])
            dispatch_hours = random.choice([24, 36, 48])
            hub_dwell_hours = random.choice([4, 5, 6])
            CourierBenchmark.objects.create(courier=c, stage="pickup_to_dispatch", expected_hours=pickup_hours)
            CourierBenchmark.objects.create(courier=c, stage="dispatch_to_delivery", expected_hours=dispatch_hours)
            CourierBenchmark.objects.create(courier=c, stage="hub_dwell_threshold", expected_hours=hub_dwell_hours)
            benchmarks[c] = {
                "pickup_to_dispatch": pickup_hours,
                "dispatch_to_delivery": dispatch_hours,
                "hub_dwell_threshold": hub_dwell_hours,
            }

        now = timezone.now()
        created = 0

        for i in range(n):
            order_id = f"ORD{1000+i}"
            courier = random.choice(COURIERS)
            pincode = random.choice(PINCODES)
            order_value = random.choice([399, 599, 799, 999, 1499, 1999])

            outcome_base = random.choices(
                ["delivered", "in_transit_delayed", "in_transit_ontime", "rejected"],
                weights=[50, 15, 5, 30]
            )[0]

            if outcome_base == "rejected":
                is_false_claim = random.random() < COURIER_FALSE_CLAIM_BIAS[courier]
                outcome = "rejected_false_claim" if is_false_claim else "rejected_genuine"
            else:
                outcome = outcome_base

            if outcome == "in_transit_delayed":
                expected = benchmarks[courier]["dispatch_to_delivery"]
                overage = random.randint(2, 10)
                dispatch_time = now - timedelta(hours=expected + overage)
            elif outcome == "in_transit_ontime":
                expected = benchmarks[courier]["dispatch_to_delivery"]
                dispatch_time = now - timedelta(hours=random.randint(2, expected - 2))
            else:
                dispatch_time = now - timedelta(hours=random.randint(10, 96))

            deadline = dispatch_time + timedelta(hours=random.choice([36, 48, 60]))

            # NEW: hub-dwell — only meaningful for in-transit orders
            if outcome == "in_transit_delayed":
                threshold = benchmarks[courier]["hub_dwell_threshold"]
                hub_overage = random.randint(2, 10)
                current_hub_arrival_time = now - timedelta(hours=threshold + hub_overage)
            elif outcome == "in_transit_ontime":
                threshold = benchmarks[courier]["hub_dwell_threshold"]
                current_hub_arrival_time = now - timedelta(hours=random.randint(0, threshold - 1))
            else:
                current_hub_arrival_time = None

            if outcome == "delivered":
                status = "delivered"
                attempt_time = dispatch_time + timedelta(hours=random.randint(20, 40))
                reason, call_made, true_reason = None, True, "none"

            elif outcome == "in_transit_delayed":
                status = "in_transit"
                attempt_time = None
                reason, call_made = None, None
                true_reason = random.choice(["congestion", "weather", "bad_address"])

            elif outcome == "in_transit_ontime":
                status = "in_transit"
                attempt_time = None
                reason, call_made = None, None
                true_reason = "none"

            elif outcome == "rejected_genuine":
                status = "rejected"
                attempt_time = dispatch_time + timedelta(hours=random.randint(30, 50))
                reason = "customer_unavailable"
                call_made = True
                true_reason = "none"

            else:  # rejected_false_claim
                status = "rto"
                attempt_time = dispatch_time + timedelta(hours=random.randint(30, 50))
                reason = "customer_unavailable"
                call_made = False
                true_reason = "courier_skip"

            Order.objects.create(
                order_id=order_id, courier=courier, pincode=pincode,
                order_value=order_value, dispatch_time=dispatch_time,
                current_hub_arrival_time=current_hub_arrival_time,
                deadline=deadline, delivery_attempt_time=attempt_time,
                status=status, courier_reported_reason=reason,
                call_log_made=call_made, delay_reason_true=true_reason,
            )
            created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} orders."))
        for status, _ in Order.STATUS_CHOICES:
            count = Order.objects.filter(status=status).count()
            self.stdout.write(f"  {status}: {count}")