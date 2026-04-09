const { config } = require("dotenv");
config({ path: ".env.local", override: true });

const { createClient } = require("@supabase/supabase-js");

const TED_API_BASE = "https://api.ted.europa.eu/v3/notices/search";

const SEARCH_FIELDS = [
  "title-proc", "title-lot", "buyer-name", "buyer-city",
  "classification-cpv", "deadline-date-lot", "deadline-receipt-tender-date-lot",
  "publication-date", "estimated-value-lot", "procedure-type",
  "description-lot", "description-proc", "place-of-performance-city-lot",
];

function extractText(multilang) {
  if (!multilang) return null;
  for (const lang of ["FRA", "fra", "NLD", "nld", "ENG", "eng"]) {
    const val = multilang[lang];
    if (val) return Array.isArray(val) ? val[0] : val;
  }
  const first = Object.values(multilang)[0];
  if (first) return Array.isArray(first) ? first[0] : first;
  return null;
}

function extractBuyerName(multilang) {
  if (!multilang) return null;
  for (const lang of ["fra", "FRA", "nld", "NLD", "eng", "ENG"]) {
    if (multilang[lang]?.[0]) return multilang[lang][0];
  }
  const first = Object.values(multilang)[0];
  return first?.[0] ?? null;
}

function mapProvince(city) {
  if (!city) return { province: null, region: null };
  const loc = city.toLowerCase();
  const mapping = {
    namur: { province: "namur", region: "wallonie" },
    liège: { province: "liege", region: "wallonie" },
    liege: { province: "liege", region: "wallonie" },
    mons: { province: "hainaut", region: "wallonie" },
    charleroi: { province: "hainaut", region: "wallonie" },
    tournai: { province: "hainaut", region: "wallonie" },
    wavre: { province: "brabant-wallon", region: "wallonie" },
    arlon: { province: "luxembourg", region: "wallonie" },
    bruxelles: { province: "bruxelles", region: "bruxelles" },
    brussel: { province: "bruxelles", region: "bruxelles" },
    brussels: { province: "bruxelles", region: "bruxelles" },
    antwerpen: { province: "anvers", region: "flandre" },
    gent: { province: "flandre-orientale", region: "flandre" },
    gand: { province: "flandre-orientale", region: "flandre" },
    brugge: { province: "flandre-occidentale", region: "flandre" },
    hasselt: { province: "limbourg", region: "flandre" },
    leuven: { province: "brabant-flamand", region: "flandre" },
    lokeren: { province: "flandre-orientale", region: "flandre" },
    kortrijk: { province: "flandre-occidentale", region: "flandre" },
    mechelen: { province: "anvers", region: "flandre" },
  };
  for (const [key, value] of Object.entries(mapping)) {
    if (loc.includes(key)) return value;
  }
  return { province: null, region: null };
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log("[fetch-ted] Fetching from TED API...");
  const allNotices = [];
  let page = 1;

  while (true) {
    const res = await fetch(TED_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "organisation-country-buyer=BEL AND classification-cpv=45* AND publication-date>20260301",
        page,
        limit: 100,
        scope: "ALL",
        fields: SEARCH_FIELDS,
      }),
    });

    if (!res.ok) throw new Error(`TED API error ${res.status}`);
    const data = await res.json();
    allNotices.push(...data.notices);
    console.log(`[fetch-ted] Page ${page}: ${data.notices.length} notices (total: ${data.totalNoticeCount})`);

    if (allNotices.length >= data.totalNoticeCount || data.notices.length < 100 || page >= 5) break;
    page++;
  }

  console.log(`[fetch-ted] Total: ${allNotices.length} notices. Inserting...`);

  let inserted = 0;
  let skipped = 0;

  for (const notice of allNotices) {
    const pubNumber = notice["publication-number"];
    const sourceId = `ted-${pubNumber}`;
    if (!pubNumber) continue;

    const city = notice["place-of-performance-city-lot"]?.[0] ?? null;
    const { province, region } = mapProvince(city);

    const title = extractText(notice["title-proc"]) ?? extractText(notice["title-lot"]) ?? `Marché TED ${pubNumber}`;
    const description = extractText(notice["description-lot"]) ?? extractText(notice["description-proc"]);
    const deadline = notice["deadline-date-lot"]?.[0] ?? notice["deadline-receipt-tender-date-lot"]?.[0] ?? null;
    const estimatedValue = notice["estimated-value-lot"]?.[0] ?? null;

    const htmlLinks = notice.links?.html;
    const sourceUrl = htmlLinks
      ? htmlLinks["FRA"] ?? htmlLinks["NLD"] ?? htmlLinks["ENG"] ?? Object.values(htmlLinks)[0]
      : null;

    const { error } = await supabase.from("tenders").upsert({
      source: "ted",
      source_id: sourceId,
      title,
      description,
      buyer_name: extractBuyerName(notice["buyer-name"]),
      buyer_location: city,
      province,
      region,
      cpv_codes: [...new Set(notice["classification-cpv"] ?? [])],
      estimated_value_min: estimatedValue,
      estimated_value_max: estimatedValue,
      currency: "EUR",
      deadline,
      publication_date: notice["publication-date"] ?? null,
      procedure_type: notice["procedure-type"] ?? null,
      documents_url: sourceUrl,
      source_url: sourceUrl,
    }, { onConflict: "source_id", ignoreDuplicates: true });

    if (error) {
      console.error(`[fetch-ted] Error ${sourceId}:`, error.message);
      skipped++;
    } else {
      inserted++;
    }
  }

  console.log(`[fetch-ted] Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("[fetch-ted] Fatal:", err);
  process.exit(1);
});
