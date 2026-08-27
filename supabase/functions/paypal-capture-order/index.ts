// Supabase Edge Function — captures an approved PayPal order server-side.
// Payment is only considered successful when PayPal reports COMPLETED.
//
// Required function secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_API

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAYPAL_API = Deno.env.get("PAYPAL_API") ?? "https://api-m.sandbox.paypal.com";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getAccessToken();
    const r = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const json = await r.json();
    if (!r.ok) {
      return new Response(JSON.stringify({ error: json?.message || "Failed to capture payment" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const capture = json?.purchase_units?.[0]?.payments?.captures?.[0];
    const capStatus = capture?.status;
    // COMPLETED → settled. PENDING → captured but held for review. Both are
    // treated as a paid order; a webhook later confirms/denies a PENDING one.
    if (json.status !== "COMPLETED" || !capture || (capStatus !== "COMPLETED" && capStatus !== "PENDING")) {
      return new Response(JSON.stringify({ error: "Payment not completed", status: capStatus || json.status }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        status: capStatus,
        paid: true,
        pendingReview: capStatus === "PENDING",
        reason: capture?.status_details?.reason ?? null,
        orderId: json.id,
        captureId: capture.id,
        amount: capture.amount,
        payerEmail: json?.payer?.email_address ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("capture-order error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
