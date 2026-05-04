// Probe the BDA search API to see what URL fields are available per publication.
import { config } from 'dotenv';
config({ path: '.env.local' });

const TOKEN_URL =
  'https://www.publicprocurement.be/auth/realms/supplier/protocol/openid-connect/token';
const SEARCH_URL = 'https://www.publicprocurement.be/api/sea/search/publications';
const CLIENT_ID = 'frontend-public';
const CLIENT_SECRET = 'dOgiVdH2CdB7sfwunDgWQ6FY4hkVAZTPUGGj4gcAtAw';

async function main() {
  console.log('Token URL:', TOKEN_URL);
  console.log('Client ID:', CLIENT_ID);
  console.log('Client Secret:', CLIENT_SECRET ? '<set>' : '<empty>');

  const tokRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }).toString(),
  });
  const tok = (await tokRes.json()) as { access_token?: string; error?: string };
  if (!tok.access_token) {
    console.log('Token response:', tok);
    process.exit(1);
  }

  const sRes = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'fr',
      'Account-Type': 'public',
      Authorization: `Bearer ${tok.access_token}`,
      'BelGov-Trace-Id': '00000000-0000-0000-0000-000000000001',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      includeOrganisationChildren: true,
      page: 1,
      pageSize: 50,
      referenceNumbers: ['PPP0FF-6000/6202/2026/MH/003_002'],
    }),
  });
  console.log('Search status:', sRes.status, sRes.statusText);
  const txt = await sRes.text();
  try {
    const data = JSON.parse(txt) as { publications?: Array<Record<string, unknown>> };
    console.log('Total results for "Blandain":', data.publications?.length ?? 0);
    for (const pub of (data.publications ?? []).slice(0, 5)) {
      const dossier = pub.dossier as { titles?: Array<{ text?: string }> } | undefined;
      const title = dossier?.titles?.[0]?.text;
      console.log({
        title: title?.slice(0, 60),
        referenceNumber: pub.referenceNumber,
        noticeIds: pub.noticeIds,
        procedureId: pub.procedureId,
        publicationWorkspaceId: pub.publicationWorkspaceId,
      });
    }
  } catch {
    console.log('Parse failed; raw body:', txt.slice(0, 800));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
