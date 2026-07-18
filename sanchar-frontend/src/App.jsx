import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Navbar from "./components/Navbar";
import Landing from "./views/Landing";
import OrdersBoard from "./views/OrdersBoard";
import OrderDetail from "./views/OrderDetail";
import PipelineView from "./views/PipelineView";
import Scorecard from "./views/Scorecard";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/orders" element={<OrdersBoard />} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route path="/orders/:orderId/pipeline" element={<PipelineView />} />
            <Route path="/scorecard" element={<Scorecard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}
