import { Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import InventoryPage from "@/pages/inventory/InventoryPage";
import ItemManagement from "@/pages/inventory/items/ItemManagement";
import ItemForm from "@/pages/inventory/items/ItemForm";
import StockVisibility from "@/pages/inventory/stock/StockVisibility";
import Adjustments from "@/pages/inventory/adjustments/Adjustments";
import GoodsReceiptPage from "@/pages/inventory/goods-receipt/GoodsReceiptPage";
import ReturnsPage from "@/pages/inventory/returns/ReturnsPage";
import InventoryTransactions from "@/pages/inventory/transactions/InventoryTransactions";

const InventoryRoutes = (
  <>
    <Route path="/inventory" element={
      <ProtectedRoute>
        <InventoryPage />
      </ProtectedRoute>
    } />

    <Route path="/inventory/items" element={
      <ProtectedRoute>
        <ItemManagement />
      </ProtectedRoute>
    } />
    
    <Route path="/inventory/items/new-selling" element={
      <ProtectedRoute>
        <ItemForm defaultCategory="Selling" hideTabs />
      </ProtectedRoute>
    } />

    <Route path="/inventory/items/new-crafting" element={
      <ProtectedRoute>
        <ItemForm defaultCategory="Crafting" hideTabs />
      </ProtectedRoute>
    } />
    
    <Route path="/inventory/items/:id/edit" element={
      <ProtectedRoute>
        <ItemForm />
      </ProtectedRoute>
    } />

    <Route path="/inventory/items/:id" element={
      <ProtectedRoute>
        <ItemManagement />
      </ProtectedRoute>
    } />

    <Route path="/inventory/transactions" element={
      <ProtectedRoute>
        <InventoryTransactions />
      </ProtectedRoute>
    } />

    <Route path="/inventory/stock" element={
      <ProtectedRoute>
        <StockVisibility />
      </ProtectedRoute>
    } />

    <Route path="/inventory/adjustments" element={
      <ProtectedRoute>
        <Adjustments />
      </ProtectedRoute>
    } />

    <Route path="/inventory/goods-receipt" element={
      <ProtectedRoute>
        <GoodsReceiptPage />
      </ProtectedRoute>
    } />

    <Route path="/inventory/returns" element={
      <ProtectedRoute>
        <ReturnsPage />
      </ProtectedRoute>
    } />
  </>
);

export default InventoryRoutes;

export const inventoryRoutes = [
  {
    path: '/inventory',
    element: <InventoryPage />
  },
  {
    path: '/inventory/items',
    element: <ItemManagement />
  },
  {
    path: '/inventory/items/new-selling',
    element: <ItemForm defaultCategory="Selling" hideTabs />
  },
  {
    path: '/inventory/items/new-crafting',
    element: <ItemForm defaultCategory="Crafting" hideTabs />
  },
  {
    path: '/inventory/items/:id/edit',
    element: <ItemForm />
  },
  {
    path: '/inventory/items/:id',
    element: <ItemManagement />
  },
  {
    path: '/inventory/transactions',
    element: <InventoryTransactions />
  },
  {
    path: '/inventory/stock',
    element: <StockVisibility />
  },
  {
    path: '/inventory/adjustments',
    element: <Adjustments />
  },
  {
    path: '/inventory/goods-receipt',
    element: <GoodsReceiptPage />
  },
  {
    path: '/inventory/returns',
    element: <ReturnsPage />
  }
];
