from django.db import models

class CourierBenchmark(models.Model):
    STAGE_CHOICES = [
        ("pickup_to_dispatch", "Pickup to Dispatch"),
        ("dispatch_to_delivery", "Dispatch to Delivery"),
    ]
    courier = models.CharField(max_length=50)
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    expected_hours = models.IntegerField()

    def __str__(self):
        return f"{self.courier} - {self.stage}: {self.expected_hours}h"


class Order(models.Model):
    STATUS_CHOICES = [
        ("in_transit", "In Transit"),
        ("delivered", "Delivered"),
        ("rejected", "Rejected"),
        ("rto", "RTO"),
    ]

    order_id = models.CharField(max_length=20, primary_key=True)
    courier = models.CharField(max_length=50)
    pincode = models.CharField(max_length=10)
    order_value = models.IntegerField()

    dispatch_time = models.DateTimeField()
    deadline = models.DateTimeField()
    delivery_attempt_time = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    courier_reported_reason = models.CharField(max_length=50, null=True, blank=True)
    call_log_made = models.BooleanField(null=True, blank=True)
    delay_reason_true = models.CharField(max_length=50, default="none")

    # populated once agents run
    mode = models.CharField(max_length=20, null=True, blank=True)
    monitor_flagged = models.BooleanField(null=True, blank=True)
    monitor_reason = models.CharField(max_length=100, null=True, blank=True)
    diagnosis_cause = models.CharField(max_length=50, null=True, blank=True)
    diagnosis_verdict = models.CharField(max_length=50, null=True, blank=True)
    diagnosis_confidence = models.FloatField(null=True, blank=True)
    diagnosis_explanation = models.TextField(null=True, blank=True)
    action_taken = models.CharField(max_length=50, null=True, blank=True)
    
    action_detail = models.TextField(null=True, blank=True)
    current_hub_arrival_time = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.order_id


class AgentTrace(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="trace")
    agent = models.CharField(max_length=20)
    output = models.CharField(max_length=200)
    timestamp = models.DateTimeField(auto_now_add=True)

class CourierApproval(models.Model):
    courier = models.CharField(max_length=50, unique=True)
    approved = models.BooleanField(default=False)
    approved_at = models.DateTimeField(auto_now=True)