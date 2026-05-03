/**
 * Microsoft Graph read spike: GET /me/calendarView (delegated).
 *
 * Azure app registration (one-time):
 * 1. Entra ID → App registrations → New registration → name it (e.g. RoomifyU Graph spike).
 * 2. Authentication → Mobile and desktop applications → add redirect URI:
 *    https://login.microsoftonline.com/common/oauth2/nativeclient
 *    (MSAL Node device flow uses the native client redirect.)
 * 3. API permissions → Microsoft Graph → Delegated → Calendars.Read (and Calendars.Read.Shared
 *    if you use SPIKE_CALENDAR_USER for a room/shared mailbox) → Grant admin consent when needed.
 * 4. Overview → copy Application (client) ID and Directory (tenant) ID into .env (see env.example).
 *
 * Run: npm install && copy env.example .env  (then edit .env)
 *      npm run spike
 */

import { PublicClientApplication } from "@azure/msal-node";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

const clientId = process.env.AZURE_CLIENT_ID?.trim();
const tenantId = process.env.AZURE_TENANT_ID?.trim() || "common";

if (!clientId) {
  console.error("Missing AZURE_CLIENT_ID. Copy env.example to .env and set variables.");
  process.exit(1);
}

const GRAPH = "https://graph.microsoft.com/v1.0";

const calendarUser = process.env.SPIKE_CALENDAR_USER?.trim();
const SCOPES = calendarUser
  ? ["Calendars.Read", "Calendars.Read.Shared"]
  : ["Calendars.Read"];

function windowUtc(days = 7) {
  const start = new Date();
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return { start, end };
}

const pca = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
  },
});

const accounts = await pca.getAllAccounts();
let result =
  accounts.length > 0
    ? await pca.acquireTokenSilent({ account: accounts[0], scopes: SCOPES }).catch(() => null)
    : null;

if (!result) {
  result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      console.log(response.message);
    },
  });
}

const { start, end } = windowUtc(Number(process.env.SPIKE_DAYS) || 7);
const params = new URLSearchParams({
  startDateTime: start.toISOString(),
  endDateTime: end.toISOString(),
});

const calendarSegment = calendarUser
  ? `users/${encodeURIComponent(calendarUser)}`
  : "me";
const url = `${GRAPH}/${calendarSegment}/calendarView?${params}`;
const res = await fetch(url, {
  headers: {
    Authorization: `Bearer ${result.accessToken}`,
    Prefer: 'outlook.timezone="UTC"',
  },
});

if (!res.ok) {
  const text = await res.text();
  console.error("Graph error", res.status, text);
  process.exit(1);
}

const data = await res.json();
const events = data.value ?? [];

console.log(
  JSON.stringify(
    {
      window: { start: start.toISOString(), end: end.toISOString() },
      count: events.length,
      sample: events.slice(0, 5).map((e) => ({
        subject: e.subject,
        start: e.start,
        end: e.end,
        id: e.id,
      })),
    },
    null,
    2
  )
);
