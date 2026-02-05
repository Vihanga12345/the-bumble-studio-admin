import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import FinancialsPage from "@/pages/financials/FinancialsPage";
import TransactionList from "@/pages/financials/transactions/TransactionList";
import CreateTransaction from "@/pages/financials/transactions/CreateTransaction";
import EditTransaction from "@/pages/financials/transactions/EditTransaction";
import ExpensesPage from "@/pages/financials/expenses/ExpensesPage";

const FinancialsRoutes = (
  <Route path="/financials">
    <Route index element={
      <ProtectedRoute>
        <FinancialsPage />
      </ProtectedRoute>
    } />
    <Route path="transactions" element={
      <ProtectedRoute>
        <TransactionList />
      </ProtectedRoute>
    } />
    <Route path="transactions/new" element={
      <ProtectedRoute>
        <CreateTransaction />
      </ProtectedRoute>
    } />
    <Route path="transactions/:id/edit" element={
      <ProtectedRoute>
        <EditTransaction />
      </ProtectedRoute>
    } />
    <Route path="expenses" element={
      <ProtectedRoute>
        <ExpensesPage />
      </ProtectedRoute>
    } />
  </Route>
);

export default FinancialsRoutes;

export const financialsRoutes = [
  {
    path: '/financials',
    element: <FinancialsPage />
  },
  {
    path: '/financials/transactions',
    element: <TransactionList />
  },
  {
    path: '/financials/transactions/new',
    element: <CreateTransaction />
  },
  {
    path: '/financials/transactions/:id/edit',
    element: <EditTransaction />
  },
  {
    path: '/financials/expenses',
    element: <ExpensesPage />
  },
  
];
