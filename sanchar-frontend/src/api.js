import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export const api = axios.create({ baseURL: API_BASE });

export const fetchOrders = (statuses = []) => {
  const params = new URLSearchParams();
  statuses.forEach((s) => params.append("status", s));
  return api.get(`/api/orders/?${params.toString()}`).then((r) => r.data);
};

export const fetchOrderDetail = (orderId) =>
  api.get(`/api/orders/${orderId}/`).then((r) => r.data);

export const fetchAggregation = () =>
  api.get("/api/aggregation/").then((r) => r.data);
export const rerunLive = (orderId) =>
  api.post(`/api/orders/${orderId}/rerun-live/`).then((r) => r.data);
export const approveCourier = (courier, approved = true) =>
  api.post("/api/aggregation/approve/", { courier, approved }).then((r) => r.data);