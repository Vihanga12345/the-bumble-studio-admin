import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import SalesPage from "@/pages/sales/SalesPage";
import CustomerList from "@/pages/sales/customers/CustomerList";
import CustomerForm from "@/pages/sales/customers/CustomerForm";
import POSPage from "@/pages/sales/pos/POSPage";
import SalesOrderList from "@/pages/sales/orders/SalesOrderList";
import CreateSalesOrder from "@/pages/sales/orders/CreateSalesOrder";
import ManualSalesOrder from "@/pages/sales/orders/ManualSalesOrder";
import SalesOrderDetail from "@/pages/sales/orders/SalesOrderDetail";
import WebsiteOrderList from "@/pages/sales/orders/WebsiteOrderList";
import SalesReturnsPage from "@/pages/sales/returns/SalesReturnsPage";
import SalesReportsPage from "@/pages/sales/reports/SalesReportsPage";

const SalesRoutes = (
  <Route path="/sales">
    <Route index element={
      <ProtectedRoute>
        <SalesPage />
      </ProtectedRoute>
    } />
    <Route path="customers" element={
      <ProtectedRoute>
        <CustomerList />
      </ProtectedRoute>
    } />
    <Route path="customers/new" element={
      <ProtectedRoute>
        <CustomerForm />
      </ProtectedRoute>
    } />
    <Route path="customers/:id" element={
      <ProtectedRoute>
        <CustomerForm />
      </ProtectedRoute>
    } />
    <Route path="orders" element={
      <ProtectedRoute>
        <SalesOrderList />
      </ProtectedRoute>
    } />
    <Route path="orders/new" element={
      <ProtectedRoute>
        <CreateSalesOrder />
      </ProtectedRoute>
    } />
    <Route path="orders/manual" element={
      <ProtectedRoute>
        <ManualSalesOrder />
      </ProtectedRoute>
    } />
    <Route path="orders/:id" element={
      <ProtectedRoute>
        <SalesOrderDetail />
      </ProtectedRoute>
    } />
    <Route path="website-orders" element={
      <ProtectedRoute>
        <WebsiteOrderList />
      </ProtectedRoute>
    } />
    <Route path="pos" element={
      <ProtectedRoute>
        <POSPage />
      </ProtectedRoute>
    } />
    <Route path="returns" element={
      <ProtectedRoute>
        <SalesReturnsPage />
      </ProtectedRoute>
    } />
    <Route path="reports" element={
      <ProtectedRoute>
        <SalesReportsPage />
      </ProtectedRoute>
    } />
  </Route>
);

export default SalesRoutes;

export const salesRoutes = [
  {
    path: '/sales',
    element: <SalesPage />
  },
  {
    path: '/sales/orders',
    element: <SalesOrderList />
  },
  {
    path: '/sales/orders/new',
    element: <CreateSalesOrder />
  },
  {
    path: '/sales/orders/manual',
    element: <ManualSalesOrder />
  },
  {
    path: '/sales/orders/:id',
    element: <SalesOrderDetail />
  },
  {
    path: '/sales/website-orders',
    element: <WebsiteOrderList />
  },
  {
    path: '/sales/customers',
    element: <CustomerList />
  },
  {
    path: '/sales/customers/new',
    element: <CustomerForm />
  },
  {
    path: '/sales/pos',
    element: <POSPage />
  },
  {
    path: '/sales/returns',
    element: <SalesReturnsPage />
  },
  {
    path: '/sales/reports',
    element: <SalesReportsPage />
  }
];
