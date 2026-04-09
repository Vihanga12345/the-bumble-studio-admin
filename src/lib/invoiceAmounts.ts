/**
 * Amount due shown on invoices must foot with line-item total minus advance.
 * Stored remaining_balance can be stale vs PDF totals; trust ~0 as "settled",
 * otherwise prefer computed total − advance when stored disagrees.
 */
export function reconcileInvoiceAmountDue(
  invoiceTotal: number,
  advancePayment: number,
  storedRemaining: number | string | null | undefined
): number {
  const adv = Math.max(Number(advancePayment) || 0, 0);
  const computed = Math.max(Number(invoiceTotal) - adv, 0);

  if (storedRemaining == null || storedRemaining === '' || Number.isNaN(Number(storedRemaining))) {
    return computed;
  }

  const r = Number(storedRemaining);
  if (r <= 0.01) return 0;
  if (Math.abs(r - computed) <= 0.02) return r;
  return computed;
}
