import { supabase } from "@/integrations/supabase/client";

const KEY = "digital_forms_visibility";

export async function getOnlyCoach(): Promise<boolean> {
  const { data } = await (supabase as any).from("school_settings").select("value").eq("key", KEY).maybeSingle();
  return !!data?.value?.only_coach;
}

export async function setOnlyCoach(only_coach: boolean): Promise<boolean> {
  const { error } = await (supabase as any).from("school_settings")
    .upsert({ key: KEY, value: { only_coach }, updated_at: new Date().toISOString() }, { onConflict: "key" });
  return !error;
}
