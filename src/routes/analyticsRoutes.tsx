import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AnalyticsPage from "@/pages/analytics/AnalyticsPage";

export const analyticsRoutes = [
  {
    path: "/analytics",
    element: <AnalyticsPage />
  }
];
