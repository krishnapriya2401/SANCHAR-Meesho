from django.contrib import admin
from django.urls import path
from core.views import HealthCheckView, OrderListView, OrderDetailView, AggregationView, RerunLiveView, SetupView

urlpatterns = [
    path("", HealthCheckView.as_view()),
    path('admin/', admin.site.urls),
    path("api/orders/", OrderListView.as_view()),
    path("api/orders/<str:order_id>/", OrderDetailView.as_view()),
    path("api/orders/<str:order_id>/rerun-live/", RerunLiveView.as_view()),
    path("api/aggregation/", AggregationView.as_view()),
    path("api/setup/<str:step>/", SetupView.as_view()),
]