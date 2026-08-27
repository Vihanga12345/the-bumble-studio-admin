import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CRAFTER_HOURLY_RATE = 200;
const DEFAULT_PROFIT_MARGIN_PERCENTAGE = 150;

export const getCrafterHourlyRate = async (): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from("crafter_settings")
    .select("hourly_rate")
    .eq("id", true)
    .maybeSingle();

  if (!error && data?.hourly_rate !== undefined && data?.hourly_rate !== null) {
    return Number(data.hourly_rate);
  }

  const { data: inserted, error: insertError } = await (supabase as any)
    .from("crafter_settings")
    .upsert(
      {
        id: true,
        hourly_rate: DEFAULT_CRAFTER_HOURLY_RATE,
      },
      { onConflict: "id" }
    )
    .select("hourly_rate")
    .single();

  if (insertError || !inserted) {
    return DEFAULT_CRAFTER_HOURLY_RATE;
  }

  return Number(inserted.hourly_rate);
};

export const setCrafterHourlyRate = async (hourlyRate: number): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from("crafter_settings")
    .upsert(
      {
        id: true,
        hourly_rate: hourlyRate,
      },
      { onConflict: "id" }
    )
    .select("hourly_rate")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to save crafter hourly rate");
  }

  return Number(data.hourly_rate);
};

export const getCrafterProfitMargin = async (): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from("crafter_settings")
    .select("profit_margin_percentage")
    .eq("id", true)
    .maybeSingle();

  if (!error && data?.profit_margin_percentage !== undefined && data?.profit_margin_percentage !== null) {
    return Number(data.profit_margin_percentage);
  }

  const { data: inserted, error: insertError } = await (supabase as any)
    .from("crafter_settings")
    .upsert(
      {
        id: true,
        hourly_rate: DEFAULT_CRAFTER_HOURLY_RATE,
        profit_margin_percentage: DEFAULT_PROFIT_MARGIN_PERCENTAGE,
      },
      { onConflict: "id" }
    )
    .select("profit_margin_percentage")
    .single();

  if (insertError || !inserted) {
    return DEFAULT_PROFIT_MARGIN_PERCENTAGE;
  }

  return Number(inserted.profit_margin_percentage);
};

export const setCrafterProfitMargin = async (profitMarginPercentage: number): Promise<number> => {
  const { data, error } = await (supabase as any)
    .from("crafter_settings")
    .upsert(
      {
        id: true,
        profit_margin_percentage: profitMarginPercentage,
      },
      { onConflict: "id" }
    )
    .select("profit_margin_percentage")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to save profit margin");
  }

  return Number(data.profit_margin_percentage);
};

