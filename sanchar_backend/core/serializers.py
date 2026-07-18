from rest_framework import serializers
from core.models import Order, AgentTrace


class AgentTraceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentTrace
        fields = ["agent", "output", "timestamp"]


class OrderListSerializer(serializers.ModelSerializer):
    diagnosis_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_id", "courier", "pincode", "order_value", "status",
            "monitor_flagged", "monitor_reason",
            "diagnosis_summary", "action_taken", "mode",
        ]

    def get_diagnosis_summary(self, obj):
        return obj.diagnosis_verdict or obj.diagnosis_cause or None

class OrderDetailSerializer(serializers.ModelSerializer):
    traces = AgentTraceSerializer(many=True, read_only=True, source="trace")

    class Meta:
        model = Order
        fields = [
            "order_id", "courier", "pincode", "order_value",
            "order_placed_time", "dispatch_time", "deadline", "delivery_attempt_time",   # order_placed_time added
            "current_hub_arrival_time", "status",
            "customer_name", "customer_phone", "delivery_address",   # NEW
            "item_name", "quantity",                                  # NEW
            "courier_reported_reason", "call_log_made", "delay_reason_true",
            "mode",
            "monitor_flagged", "monitor_reason",
            "diagnosis_cause", "diagnosis_verdict", "diagnosis_confidence", "diagnosis_explanation",
            "action_taken", "action_detail",
            "traces",
        ]

    def get_mode(self, obj):
        if obj.status == "in_transit":
            return "prevent"
        elif obj.status in ("rejected", "rto"):
            return "resolve"
        return "no_action"