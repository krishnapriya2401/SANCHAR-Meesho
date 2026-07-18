import os

from django.shortcuts import render
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.core.mail import send_mail
from django.core.management import call_command


from core.models import Order
from core.serializers import OrderListSerializer, OrderDetailSerializer
from core.agents.aggregation import run_aggregation
from core.agents.monitor import order_to_state
from core.agents.graph import build_graph


class OrderListView(ListAPIView):
    """
    GET /api/orders/               -> all orders
    GET /api/orders/?status=in_transit
    GET /api/orders/?status=rejected&status=rto   (Resolve mode filter, both statuses)
    Dashboard's Prevent/Resolve filter maps directly onto `status`.
    """
    serializer_class = OrderListSerializer

    def get_queryset(self):
        qs = Order.objects.exclude(status="delivered").order_by("order_id")
        status_param = self.request.query_params.getlist("status")
        if status_param:
            qs = qs.filter(status__in=status_param)
        return qs


class OrderDetailView(RetrieveAPIView):
    """GET /api/orders/<order_id>/  -> full trace for the Order Detail view."""
    serializer_class = OrderDetailSerializer
    lookup_field = "order_id"
    queryset = Order.objects.prefetch_related("trace")


class AggregationView(APIView):
    """
    GET /api/aggregation/  -> live scorecard, computed on request (not cached), so it always
    reflects the current DB state. Cheap enough at ~180 orders that this is fine to compute live.
    """
    def get(self, request):
        return Response(run_aggregation())


class RerunLiveView(APIView):
    """POST /api/orders/<order_id>/rerun-live/  -> run the pipeline live and return structured output.
    Optional JSON body: {"email": "user@example.com"} to email the action agent output.
    """

    def post(self, request, order_id):
        try:
            order = Order.objects.get(order_id=order_id)
        except Order.DoesNotExist:
            return Response({"error": "Order not found"}, status=http_status.HTTP_404_NOT_FOUND)

        graph = build_graph()
        state = order_to_state(order)
        result = graph.invoke(state)

        email = request.data.get("email")
        email_status = None
        if email and email.strip():
            item = order.item_name or "your order"
            action_taken = result.get("action_taken")
            diagnosis_cause = result.get("diagnosis_cause", "")
            compensation = 200 if (order.order_value or 0) >= 3000 else 100

            if action_taken == "wallet_credit":
                body = (
                    f"Dear Customer,\n\n"
                    f"Your order {order_id} ({item}) is currently on hold due to an address verification issue.\n\n"
                    f"As a gesture of goodwill, we have credited \u20b9{compensation} to your wallet.\n"
                    f"Once the verification is complete, your order will resume delivery.\n\n"
                    f"We apologize for the inconvenience.\n\n\u2014 Sanchar Team"
                )
            elif action_taken == "courier_invoice":
                body = (
                    f"Dear Customer,\n\n"
                    f"We are investigating the delivery issue with your order {order_id} ({item}).\n\n"
                    f"Our team has identified that no genuine delivery attempt was made.\n"
                    f"We are taking this up with the courier partner and will update you within 2\u20133 business days.\n\n"
                    f"We apologize for the inconvenience.\n\n\u2014 Sanchar Team"
                )
            elif action_taken == "free_reshipment":
                body = (
                    f"Dear Customer,\n\n"
                    f"Your order {order_id} ({item}) encountered a delivery issue.\n\n"
                    f"We have initiated a free reshipment at no additional cost.\n"
                    f"Your replacement will be dispatched shortly. You will receive tracking details once available.\n\n"
                    f"We apologize for the inconvenience.\n\n\u2014 Sanchar Team"
                )
            elif action_taken == "status_update_sms":
                delay = "1\u20132 days"
                delay_detail = "due to hub congestion" if diagnosis_cause == "hub_congestion" else "due to weather conditions"
                body = (
                    f"Dear Customer,\n\n"
                    f"Your order {order_id} ({item}) is experiencing a delivery delay {delay_detail}.\n\n"
                    f"Your revised estimated delivery is within {delay} of the original date.\n"
                    f"As a gesture of goodwill, we have added \u20b9{compensation} cashback to your account.\n\n"
                    f"We apologize for the inconvenience.\n\n\u2014 Sanchar Team"
                )
            else:
                body = (
                    f"Dear Customer,\n\n"
                    f"Your order {order_id} ({item}) is currently delayed.\n\n"
                    f"Our team is working to resolve the issue and your order will be delivered as soon as possible.\n\n"
                    f"We apologize for the inconvenience.\n\n\u2014 Sanchar Team"
                )

            subject = f"Update on your order {order_id}"
            try:
                send_mail(subject, body, None, [email], fail_silently=False)
                email_status = "sent"
            except Exception as exc:
                email_status = f"failed: {exc}"

        return Response({
            "monitor": result.get("monitor_output", {
                "summary": "No monitor output",
                "metrics": [],
                "carries_forward": "",
            }),
            "diagnosis": result.get("diagnosis_output", {
                "summary": "No diagnosis output",
                "metrics": [],
                "carries_forward": "",
            }),
            "action": result.get("action_output", {
                "summary": "No action output",
                "metrics": [],
                "carries_forward": "",
            }),
            "email_status": email_status,
            # Keep legacy fields for backward compatibility
            "monitor_reason": result.get("monitor_reason"),
            "diagnosis_explanation": result.get("diagnosis_explanation"),
            "action_detail": result.get("action_detail"),
            "diagnosis_verdict": result.get("diagnosis_verdict"),
            "action_taken": result.get("action_taken"),
        })


class SetupView(APIView):
    """POST /api/setup/generate/  ->  generate_data (lightweight, creates orders + PipelineClock).
       POST /api/setup/pipeline/  ->  run_pipeline (heavy, runs agents on all orders).
    Send JSON: {"key": "..."}
    """

    def _check_key(self, request):
        key = request.data.get("key")
        expected = os.getenv("SETUP_KEY", "")
        if not expected or key != expected:
            return None
        return True

    def post(self, request, step=None):
        if not self._check_key(request):
            return Response({"error": "invalid key"}, status=http_status.HTTP_403_FORBIDDEN)

        if step == "generate":
            if Order.objects.count() > 0:
                return Response({"message": "data already exists — send {\"force\":true} to re-seed"})
            try:
                call_command("generate_data")
                return Response({"message": "data generation complete"})
            except Exception as e:
                return Response({"error": str(e)}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

        elif step == "pipeline":
            try:
                call_command("run_pipeline")
                return Response({"message": "pipeline complete"})
            except Exception as e:
                return Response({"error": str(e)}, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

        else:
            return Response({"error": "specify step: generate or pipeline"}, status=http_status.HTTP_400_BAD_REQUEST)


class ApproveCourierView(APIView):

    def post(self, request):
        courier = request.data.get("courier")
        approved = request.data.get("approved", True)

        if not courier:
            return Response({"error": "courier is required"}, status=http_status.HTTP_400_BAD_REQUEST)

        from core.models import CourierApproval
        CourierApproval.objects.update_or_create(
            courier=courier,
            defaults={"approved": approved},
        )
        return Response({"courier": courier, "approved": approved})
       