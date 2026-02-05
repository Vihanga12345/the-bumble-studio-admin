import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import SettingsPage from "@/pages/settings/SettingsPage";

export const settingsRoutes = [
  {
    path: "/settings",
    element: <SettingsPage />
  }
];
