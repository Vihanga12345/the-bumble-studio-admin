// Supabase Edge Function — creates a PayPal order server-side.
// The PayPal client SECRET never touches the browser, and the charged amount
// is recomputed from authoritative DB prices to prevent tampering.
//
// Required function secrets (set via `supabase secrets set`):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API,
//   PAYPAL_CURRENCY (default USD), LKR_PER_USD (default 300),
//   SHIPPING_FEE_LKR (default 500)
// SUPABASE_URL and SUPABASE_ANON_KEY are injected automatically.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API = Deno.env.get("PAYPAL_API") ?? "https://api-m.sandbox.paypal.com";
const PAYPAL_CURRENCY = Deno.env.get("PAYPAL_CURRENCY") ?? "USD";
const RATE = Number(Deno.env.get("LKR_PER_USD") ?? "300") || 300;
const SHIPPING = Number(Deno.env.get("SHIPPING_FEE_LKR") ?? "500") || 500;

async function getAccessToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal is not configured on the server.");
  const auth = btoa(`${id}:${secret}`);
  const r = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`PayPal auth failed: ${json.error_description || r.status}`);
  return json.access_token;
}

async function computeAuthoritativeTotal(items: Array<{ productId: string; quantity: number }>) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Cart is empty");
  const ids = [...new Set(items.map((i) => i.productId).filter(Boolean))];
  if (ids.length === 0) throw new Error("No valid product ids");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const url =
    `${supabaseUrl}/rest/v1/inventory_items` +
    `?id=in.(${ids.join(",")})&select=id,name,is_active,selling_price,sale_price`;
  const r = await fetch(url, { headers: { apikey: anonKey!, Authorization: `Bearer ${anonKey}` } });
  if (!r.ok) throw new Error(`Could not load product prices (${r.status})`);
  const rows = await r.json();
  const map = new Map(rows.map((p: Record<string, unknown>) => [p.id, p]));

  let lkrSubtotal = 0;
  for (const item of items) {
    const product = map.get(item.productId) as Record<string, unknown> | undefined;
    if (!product || !product.is_active) throw new Error(`Product not available: ${item.productId}`);
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Invalid quantity`);
    const unit = Number((product.sale_price ?? product.selling_price ?? 0) as number);
    lkrSubtotal += unit * qty;
  }

  const lkrTotal = lkrSubtotal + (lkrSubtotal > 0 ? SHIPPING : 0);
  const usdTotal = Math.max(0.01, Math.round((lkrTotal / RATE) * 100) / 100);
  return { lkrTotal, usdTotal };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { items } = await req.json();
    const totals = await computeAuthoritativeTotal(items);
    const accessToken = await getAccessToken();

    const r = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `tbs-${Date.now()}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            amount: { currency_code: PAYPAL_CURRENCY, value: totals.usdTotal.toFixed(2) },
            description: "The Bumble Studio — handcrafted leather order",
          },
        ],
        application_context: {
          brand_name: "The Bumble Studio",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
        },
      }),
    });
    const json = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: json?.message || "Failed to create PayPal order" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ id: json.id, currency: PAYPAL_CURRENCY, usdTotal: totals.usdTotal, lkrTotal: totals.lkrTotal, rate: RATE }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("create-order error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
