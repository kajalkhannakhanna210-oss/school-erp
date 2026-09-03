import { NextRequest, NextResponse } from "next/server";
import { getCitiesByDistrict, getDistrictsByState, getPincodesByCity, getStates, searchPincodes } from "@/lib/location-master";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams; const type = params.get("type"); const query = params.get("q") ?? ""; const id = params.get("id") ?? "";
  try { const data = type === "states" ? await getStates(query) : type === "districts" ? await getDistrictsByState(id, query) : type === "cities" ? await getCitiesByDistrict(id, query) : type === "pincodes" ? (id ? await getPincodesByCity(id, query) : await searchPincodes(query)) : null; if (!data) return NextResponse.json({ error: "Invalid location query." }, { status: 400 }); return NextResponse.json({ data }); } catch { return NextResponse.json({ error: "Unable to load location data." }, { status: 500 }); }
}
