import { config } from "dotenv";
config({ path: ".env.local" });
import { createServiceClient } from "../lib/supabase";

const TED_API_BASE = "https://api.ted.europa.eu/v3/notices/search";

const SEARCH_FIELDS = [
  "title-proc",
  "title-lot",
  "buyer-name",
  "buyer-city",
  "classification-cpv",
  "deadline-date-lot",
  "deadline-receipt-tender-date-lot",
  "publication-date",
  "estimated-value-lot",
  "estimated-value-cur-lot",
  "procedure-type",
  "description-lot",
  "description-proc",
  "place-of-performance-city-lot",
  "notice-identifier",
];

interface TedNotice {
  "notice-identifier"?: string;
  "publication-number"?: string;
  "title-proc"?: Record<string, string>;
  "title-lot"?: Record<string, string | string[]>;
  "buyer-name"?: Record<string, string[]>;
  "buyer-city"?: Record<string, string[]>;
  "classification-cpv"?: string[];
  "estimated-value-lot"?: number[];
  "estimated-value-cur-lot"?: string[];
  "deadline-date-lot"?: string[];
  "deadline-receipt-tender-date-lot"?: string[];
  "publication-date"?: string;
  "procedure-type"?: string;
  "description-lot"?: Record<string, string[]>;
  "description-proc"?: Record<string, string>;
  "place-of-performance-city-lot"?: string[];
  links?: {
    html?: Record<string, string>;
    pdf?: Record<string, string>;
  };
}

interface TedSearchResponse {
  notices: TedNotice[];
  totalNoticeCount: number;
}

function extractText(multilang: Record<string, string | string[]> | undefined): string | null {
  if (!multilang) return null;
  for (const lang of ["FRA", "fra", "NLD", "nld", "ENG", "eng"]) {
    const val = multilang[lang];
    if (val) return Array.isArray(val) ? val[0] : val;
  }
  const first = Object.values(multilang)[0];
  if (first) return Array.isArray(first) ? first[0] : first;
  return null;
}

function extractBuyerName(multilang: Record<string, string[]> | undefined): string | null {
  if (!multilang) return null;
  for (const lang of ["fra", "FRA", "nld", "NLD", "eng", "ENG"]) {
    if (multilang[lang]?.[0]) return multilang[lang][0];
  }
  const first = Object.values(multilang)[0];
  return first?.[0] ?? null;
}

function mapProvince(city: string | null): { province: string | null; region: string | null } {
  if (!city) return { province: null, region: null };
  const loc = city.toLowerCase();

  const mapping: Record<string, { province: string; region: string }> = {
    namur: { province: "namur", region: "wallonie" },
    liège: { province: "liege", region: "wallonie" },
    liege: { province: "liege", region: "wallonie" },
    hainaut: { province: "hainaut", region: "wallonie" },
    mons: { province: "hainaut", region: "wallonie" },
    charleroi: { province: "hainaut", region: "wallonie" },
    tournai: { province: "hainaut", region: "wallonie" },
    wavre: { province: "brabant-wallon", region: "wallonie" },
    ottignies: { province: "brabant-wallon", region: "wallonie" },
    luxembourg: { province: "luxembourg", region: "wallonie" },
    arlon: { province: "luxembourg", region: "wallonie" },
    bruxelles: { province: "bruxelles", region: "bruxelles" },
    brussel: { province: "bruxelles", region: "bruxelles" },
    brussels: { province: "bruxelles", region: "bruxelles" },
    antwerpen: { province: "anvers", region: "flandre" },
    anvers: { province: "anvers", region: "flandre" },
    gent: { province: "flandre-orientale", region: "flandre" },
    gand: { province: "flandre-orientale", region: "flandre" },
    bruges: { province: "flandre-occidentale", region: "flandre" },
    brugge: { province: "flandre-occidentale", region: "flandre" },
    hasselt: { province: "limbourg", region: "flandre" },
    leuven: { province: "brabant-flamand", region: "flandre" },
    louvain: { province: "brabant-flamand", region: "flandre" },
    lokeren: { province: "flandre-orientale", region: "flandre" },
    kortrijk: { province: "flandre-occidentale", region: "flandre" },
    mechelen: { province: "anvers", region: "flandre" },
  };

  for (const [key, value] of Object.entries(mapping)) {
    if (loc.includes(key)) return value;
  }
  return { province: null, region: null };
}

async function fetchTedNotices(): Promise<TedNotice[]> {
  const allNotices: TedNotice[] = [];
  let page = 1;
  const pageSize = 100;

  const query = "organisation-country-buyer=BEL AND classification-cpv=45* AND publication-date>20260301";

  while (true) {
    const body = {
      query,
      page,
      limit: pageSize,
      scope: "ALL",
      fields: SEARCH_FIELDS,
    };

    const response = await fetch(TED_API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TED API error ${response.status}: ${text.slice(0, 300)}`);
    }

    const data: TedSearchResponse = await response.json();
    allNotices.push(...data.notices);

    console.log(`[fetch-ted] Page ${page}: got ${data.notices.length} notices (total available: ${data.totalNoticeCount})`);

    if (allNotices.length >= data.totalNoticeCount || data.notices.length < pageSize) {
      break;
    }
    page++;

    if (page > 5) {
      console.log("[fetch-ted] Capped at 500 notices");
      break;
    }
  }

  return allNotices;
}

async function main() {
  const supabase = createServiceClient();

  console.log("[fetch-ted] Fetching notices from TED API...");
  const notices = await fetchTedNotices();
  console.log(`[fetch-ted] Total fetched: ${notices.length} notices`);

  let inserted = 0;
  let skipped = 0;

  for (const notice of notices) {
    const pubNumber = notice["publication-number"];
    const noticeId = notice["notice-identifier"];
    const sourceId = `ted-${pubNumber ?? noticeId}`;
    if (!sourceId || sourceId === "ted-undefined") continue;

    const city = notice["place-of-performance-city-lot"]?.[0] ?? null;
    const { province, region } = mapProvince(city);

    const title =
      extractText(notice["title-proc"]) ??
      extractText(notice["title-lot"] as Record<string, string> | undefined) ??
      `Marché TED ${pubNumber}`;

    const description =
      extractText(notice["description-lot"] as Record<string, string> | undefined) ??
      extractText(notice["description-proc"]);

    const deadline = notice["deadline-date-lot"]?.[0] ??
      notice["deadline-receipt-tender-date-lot"]?.[0] ?? null;

    const estimatedValue = notice["estimated-value-lot"]?.[0] ?? null;

    const htmlLinks = notice.links?.html;
    const sourceUrl = htmlLinks
      ? htmlLinks["FRA"] ?? htmlLinks["NLD"] ?? htmlLinks["ENG"] ?? Object.values(htmlLinks)[0]
      : null;

    const tender = {
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
      raw_data: notice as unknown as Record<string, unknown>,
    };

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await supabase.from("tenders").upsert(tender, {
          onConflict: "source_id",
          ignoreDuplicates: true,
        });

        if (error) {
          console.error(`[fetch-ted] DB error ${sourceId}:`, error.message);
          skipped++;
        } else {
          inserted++;
        }
        break;
      } catch (err: unknown) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        console.error(`[fetch-ted] Failed after retries ${sourceId}:`, (err as Error).message);
        skipped++;
      }
    }

    if (inserted % 20 === 0 && inserted > 0) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(`[fetch-ted] Done. Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch((err) => {
  console.error("[fetch-ted] Fatal error:", err);
  process.exit(1);
});
