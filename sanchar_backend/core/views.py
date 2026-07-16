from django.shortcuts import render
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status


from core.models import Order
from core.serializers import OrderListSerializer, OrderDetailSerializer
from core.agents.aggregation import run_aggregation


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
       