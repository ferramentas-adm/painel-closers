import { google } from "googleapis";

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

export const googleCalendarConfigured = !!(
  SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY
);

function clientFor(email) {
  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    subject: email,
  });
}

// Retorna um Set com os emails que estao em reuniao agora.
export async function getBusyEmailsNow(emails) {
  if (!googleCalendarConfigured || emails.length === 0) return new Set();

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 1000).toISOString();

  const busy = new Set();
  await Promise.all(
    emails.map(async (email) => {
      try {
        const auth = clientFor(email);
        const calendar = google.calendar({ version: "v3", auth });
        const res = await calendar.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            items: [{ id: email }],
          },
        });
        const periods = res.data.calendars?.[email]?.busy ?? [];
        if (periods.length > 0) busy.add(email);
      } catch (err) {
        console.error(`Falha ao consultar agenda de ${email}:`, err.message);
      }
    })
  );
  return busy;
}
