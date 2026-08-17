import { google } from "googleapis";

const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(
  /\\n/g,
  "\n"
);

const ADMIN_EMAIL = process.env.GOOGLE_ADMIN_EMAIL;

export const googleCalendarConfigured = !!(
  SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY
);

export const googleDirectoryConfigured = !!(
  SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY && ADMIN_EMAIL
);

function clientFor(email, scopes = ["https://www.googleapis.com/auth/calendar.readonly"]) {
  return new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: SERVICE_ACCOUNT_PRIVATE_KEY,
    scopes,
    subject: email,
  });
}

// Busca o nome completo cadastrado no Google Workspace pra esse email.
// Precisa de GOOGLE_ADMIN_EMAIL (um super admin) pra ter permissao de ler o diretorio.
export async function getFullNameFromDirectory(email) {
  if (!googleDirectoryConfigured) return null;
  try {
    const auth = clientFor(ADMIN_EMAIL, [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
    ]);
    const directory = google.admin({ version: "directory_v1", auth });
    const res = await directory.users.get({ userKey: email });
    return res.data.name?.fullName || null;
  } catch (err) {
    console.error(`Falha ao buscar nome no diretorio para ${email}:`, err.message);
    return null;
  }
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

// Retorna o evento acontecendo agora nessa agenda (titulo, horario, convidados), ou null.
export async function getCurrentEvent(email) {
  if (!googleCalendarConfigured) return null;

  const now = new Date();
  const margem = 4 * 60 * 60 * 1000; // 4h pra pegar eventos que cobrem "agora"
  try {
    const auth = clientFor(email);
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.list({
      calendarId: email,
      timeMin: new Date(now.getTime() - margem).toISOString(),
      timeMax: new Date(now.getTime() + margem).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });
    const eventos = res.data.items ?? [];
    const atual = eventos.find((e) => {
      const inicio = e.start?.dateTime || e.start?.date;
      const fim = e.end?.dateTime || e.end?.date;
      if (!inicio || !fim) return false;
      return new Date(inicio) <= now && now <= new Date(fim);
    });
    if (!atual) return null;

    return {
      titulo: atual.summary || "(sem titulo)",
      inicio: atual.start?.dateTime || atual.start?.date,
      fim: atual.end?.dateTime || atual.end?.date,
      participantes: (atual.attendees ?? [])
        .map((a) => a.displayName || a.email)
        .filter(Boolean),
    };
  } catch (err) {
    console.error(`Falha ao buscar evento atual de ${email}:`, err.message);
    return null;
  }
}
