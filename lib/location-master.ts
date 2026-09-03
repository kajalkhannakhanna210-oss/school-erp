import { createClient } from "@/lib/supabase/server";

export type LocationOption = { id: string; name: string; label?: string };
export type PincodeLocation = { id: string; pincode: string; stateId: string; districtId: string; cityId: string | null; state: string; district: string; city: string | null; post_office_name: string | null };
const MAX_RESULTS = 25;
const bounded = (value: string | undefined) => Math.min(Math.max(Number(value || MAX_RESULTS), 1), MAX_RESULTS);

export async function getStates(query = "", limit = MAX_RESULTS): Promise<LocationOption[]> {
  const supabase = await createClient(); let request = supabase.from("states").select("id,state_name").eq("is_active", true).order("sort_order").limit(bounded(String(limit)));
  if (query.trim()) request = request.ilike("state_name", `%${query.trim()}%`);
  const { data } = await request; return (data ?? []).map((row) => ({ id: row.id, name: row.state_name }));
}
export async function getDistrictsByState(stateId: string, query = "", limit = MAX_RESULTS): Promise<LocationOption[]> {
  if (!stateId) return []; const supabase = await createClient(); let request = supabase.from("districts").select("id,district_name").eq("state_id", stateId).eq("is_active", true).order("district_name").limit(bounded(String(limit)));
  if (query.trim()) request = request.ilike("district_name", `%${query.trim()}%`); const { data } = await request; return (data ?? []).map((row) => ({ id: row.id, name: row.district_name }));
}
export async function getCitiesByDistrict(districtId: string, query = "", limit = MAX_RESULTS): Promise<LocationOption[]> {
  if (!districtId) return []; const supabase = await createClient(); let request = supabase.from("cities").select("id,city_name").eq("district_id", districtId).eq("is_active", true).order("city_name").limit(bounded(String(limit)));
  if (query.trim()) request = request.ilike("city_name", `%${query.trim()}%`); const { data } = await request; return (data ?? []).map((row) => ({ id: row.id, name: row.city_name }));
}
export async function getPincodesByCity(cityId: string, query = "", limit = MAX_RESULTS): Promise<PincodeLocation[]> {
  if (!cityId) return []; const supabase = await createClient(); let request = supabase.from("pincodes").select("id,pincode,post_office_name,cities(city_name),states(state_name),districts(district_name)").eq("city_id", cityId).eq("is_active", true).order("pincode").limit(bounded(String(limit)));
  if (query.trim()) request = request.ilike("pincode", `${query.trim()}%`); const { data } = await request; return mapPincodes(data);
}
export async function searchPincodes(query: string, limit = MAX_RESULTS): Promise<PincodeLocation[]> {
  const value = query.trim(); if (!/^[0-9]{1,6}$/.test(value)) return []; const supabase = await createClient(); const { data } = await supabase.from("pincodes").select("id,pincode,post_office_name,cities(city_name),states(state_name),districts(district_name)").eq("is_active", true).ilike("pincode", `${value}%`).order("pincode").limit(bounded(String(limit))); return mapPincodes(data);
}
export async function getLocationsByPincode(pincode: string, limit = MAX_RESULTS): Promise<PincodeLocation[]> { return searchPincodes(pincode, limit); }
function mapPincodes(rows: unknown): PincodeLocation[] { return (rows as Array<Record<string, unknown>> ?? []).map((row) => { const city = row.cities as Record<string, string> | null; const state = row.states as Record<string, string> | null; const district = row.districts as Record<string, string> | null; return { id: String(row.id), pincode: String(row.pincode), stateId: String(state?.id ?? ""), districtId: String(district?.id ?? ""), cityId: city?.id ? String(city.id) : null, post_office_name: row.post_office_name ? String(row.post_office_name) : null, city: city?.city_name ?? null, state: state?.state_name ?? "", district: district?.district_name ?? "" }; }); }
