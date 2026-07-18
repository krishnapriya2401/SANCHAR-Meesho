from django.contrib import admin
from django.urls import path
from core.views import OrderListView, OrderDetailView, AggregationView, ApproveCourierView, RerunLiveView, SetupView

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/orders/", OrderListView.as_view()),
    path("api/orders/<str:order_id>/", OrderDetailView.as_view()),
    path("api/orders/<str:order_id>/rerun-live/", RerunLiveView.as_view()),
    path("api/aggregation/", AggregationView.as_view()),
    path("api/aggregation/approve/", ApproveCourierView.as_view()),
    path("api/setup/", SetupView.as_view()),
]