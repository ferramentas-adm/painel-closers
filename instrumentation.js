export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCalendarSync } = await import("@/lib/calendar-sync");
    startCalendarSync();
  }
}
