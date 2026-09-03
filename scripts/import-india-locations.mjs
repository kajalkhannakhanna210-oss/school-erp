import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2] || "C:/Users/KAJAL/AppData/Local/Temp/all_india_pin_code.csv";
const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*([^#\r\n]*)/)).filter(Boolean).map((m) => [m[1], m[2].trim().replace(/^['"]|['"]$/g, "")]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const clean = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
function parseCsv(text) { const rows = []; let row = [], value = "", quoted = false; for (let i = 0; i < text.length; i++) { const c = text[i], n = text[i + 1]; if (c === '"' && quoted && n === '"') { value += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === ',' && !quoted) { row.push(value); value = ""; } else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && n === '\n') i++; row.push(value); if (row.some((v) => v.trim())) rows.push(row); row = []; value = ""; } else value += c; } if (value || row.length) { row.push(value); rows.push(row); } return rows; }
const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
const headers = rows.shift().map((h) => clean(h).toLowerCase());
const records = rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, clean(r[i])]))).filter((r) => /^[1-9][0-9]{5}$/.test(r.pincode) && r.statename && r.districtname);
const upsertAll = async (table, data, onConflict) => { const deduped = [...new Map(data.map((row) => [onConflict.split(",").map((key) => row[key]).join("\u0000"), row])).values()]; const batches = []; for (let i = 0; i < deduped.length; i += 500) batches.push(deduped.slice(i, i + 500)); for (let i = 0; i < batches.length; i += 8) { const results = await Promise.all(batches.slice(i, i + 8).map((batch) => admin.from(table).upsert(batch, { onConflict }))); const failure = results.find((result) => result.error); if (failure?.error) throw new Error(`${table}: ${failure.error.message}`); } };
const { data: country, error: countryError } = await admin.from("countries").upsert({ country_code: "IN", country_name: "India", iso2: "IN", iso3: "IND", phone_code: "+91", is_active: true }, { onConflict: "iso2" }).select("id").single();
if (countryError) throw countryError;
const stateNames = [...new Set(records.map((r) => r.statename))].sort();
await upsertAll("states", stateNames.map((name, i) => ({ country_id: country.id, state_name: name, state_code: name.slice(0, 3), state_type: ["ANDAMAN AND NICOBAR ISLANDS", "CHANDIGARH", "DADRA AND NAGAR HAVELI", "DAMAN AND DIU", "DELHI", "JAMMU AND KASHMIR", "LADAKH", "LAKSHADWEEP", "PUDUCHERRY"].includes(name) ? "UNION_TERRITORY" : "STATE", sort_order: i + 1, is_active: true })), "country_id,state_name");
const { data: states, error: statesError } = await admin.from("states").select("id,state_name").eq("country_id", country.id); if (statesError) throw statesError;
const stateMap = new Map(states.map((s) => [s.state_name, s.id]));
const districtKeys = [...new Set(records.map((r) => `${r.statename}\u0000${r.districtname}`))];
await upsertAll("districts", districtKeys.map((key) => { const [state, name] = key.split("\u0000"); return { state_id: stateMap.get(state), district_name: name, is_active: true }; }), "state_id,district_name");
const { data: districts, error: districtsError } = await admin.from("districts").select("id,state_id,district_name"); if (districtsError) throw districtsError;
const districtMap = new Map(districts.map((d) => [`${d.state_id}\u0000${d.district_name}`, d.id]));
const cityKeys = [...new Set(records.map((r) => { const sid = stateMap.get(r.statename), did = districtMap.get(`${sid}\u0000${r.districtname}`); return `${sid}\u0000${did}\u0000${r.Taluk || r.officename}`; }))];
await upsertAll("cities", cityKeys.filter((key) => !key.endsWith("\u0000")).map((key) => { const [state_id, district_id, city_name] = key.split("\u0000"); return { state_id, district_id, city_name, city_type: "LOCALITY", is_active: true }; }), "district_id,city_name");
const { data: cities, error: citiesError } = await admin.from("cities").select("id,state_id,district_id,city_name"); if (citiesError) throw citiesError;
const cityMap = new Map(cities.map((c) => [`${c.state_id}\u0000${c.district_id}\u0000${c.city_name}`, c.id]));
await upsertAll("pincodes", records.map((r) => { const state_id = stateMap.get(r.statename), district_id = districtMap.get(`${state_id}\u0000${r.districtname}`), city_name = r.Taluk || r.officename; return { pincode: r.pincode, country_id: country.id, state_id, district_id, city_id: cityMap.get(`${state_id}\u0000${district_id}\u0000${city_name}`) || null, post_office_name: r.officename || null, office_type: r.officetype || null, delivery_status: r.deliverystatus || null, division_name: r.divisionname || null, region_name: r.regionname || null, circle_name: r.circlename || null, is_active: true }; }), "pincode,district_id,post_office_name");
const counts = await Promise.all(["states", "districts", "cities", "pincodes"].map(async (table) => { const { count, error } = await admin.from(table).select("id", { count: "exact", head: true }); if (error) throw error; return `${table}=${count}`; }));
console.log(`Imported ${records.length} source records; ${counts.join(", ")}.`);
