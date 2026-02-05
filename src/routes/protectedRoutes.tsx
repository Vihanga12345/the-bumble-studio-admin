
import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Index from "@/pages/Index";

const ProtectedRoutes = (
  <Route path="/" element={
    <ProtectedRoute>
      <Index />
    </ProtectedRoute>
  } />
);

export default ProtectedRoutes;
