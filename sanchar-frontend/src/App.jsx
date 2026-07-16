import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import Dashboard from "./views/Dashboard";
import OrderDetail from "./views/OrderDetail";
import Scorecard from "./views/Scorecard";

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <nav style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}>
          <Link to="/" style={{ marginRight: "1rem" }}>Dashboard</Link>
          <Link to="/scorecard">Courier Scorecard</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/scorecard" element={<Scorecard />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}