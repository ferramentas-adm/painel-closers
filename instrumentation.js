export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCalendarSync } = await import("@/lib/calendar-sync");
    startCalendarSync();

    const { startHeartbeatSweep } = await import("@/lib/heartbeat-sync");
    startHeartbeatSweep();
  }
}
