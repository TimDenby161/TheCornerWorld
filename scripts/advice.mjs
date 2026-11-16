// The UK government's travel advice page for a country, as the last part of its address
// (https://www.gov.uk/foreign-travel-advice/<slug>). scripts/build-data.mjs writes it into countries.json
// as `advice`; the guide pages and the map link to it. Checked against GOV.UK on 16 November 2026: every
// country on the map either has its page here or gets "" (GOV.UK's list of countries). The UK and the
// Crown Dependencies get null: there's no travel advice for home.
//
// A state or island (`within` another country) takes the advice of the country it's in.
const HOME = new Set(["GBR", "GGY", "JEY", "IMN"]);
const SLUGS = {
  TUR: "turkey", USA: "usa", VAT: "italy", XWB: "palestine", XGZ: "palestine",
  CIV: "cote-d-ivoire", COD: "democratic-republic-of-the-congo", COG: "congo", MAC: "macao", GMB: "the-gambia",
  KNA: "st-kitts-and-nevis", LCA: "st-lucia", VCT: "st-vincent-and-the-grenadines", SXM: "st-maarten",
  MAF: "st-martin-and-st-barthelemy", BLM: "st-martin-and-st-barthelemy", SPM: "st-pierre-and-miquelon",
  SHN: "st-helena-ascension-and-tristan-da-cunha", FSM: "federated-states-of-micronesia",
  COK: "cook-islands-tokelau-and-niue", NIU: "cook-islands-tokelau-and-niue", TKL: "cook-islands-tokelau-and-niue",
  ASM: "usa", GUM: "usa", MNP: "usa", PRI: "usa", VIR: "usa", UMI: "usa",
  FRO: "denmark", GRL: "denmark", ALA: "finland", SJM: "norway", BVT: "norway", PCN: "pitcairn-island",
  SGS: "south-georgia-and-south-sandwich-islands", BES: "bonaire-st-eustatius-saba",
  CXR: "australia", CCK: "australia", NFK: "australia", HMD: "australia", ATF: "france",
};

const slug = (name) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// `country` has id, name and maybe within; `byId` finds the country it's within
export function advice(country, byId) {
  if (HOME.has(country.id)) return null;
  if (country.id in SLUGS) return SLUGS[country.id];
  const whole = country.within && byId.get(country.within);
  return whole ? advice(whole, byId) : slug(country.name);
}
