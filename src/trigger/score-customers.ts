import { schedules } from "@trigger.dev/sdk";
import { runScoreCustomers } from "@/lib/jobs/score-customers";

export const scoreCustomersTask = schedules.task({
  id: "score-customers",
  cron: { pattern: "0 4 * * *", timezone: "UTC" },
  run: async () => {
    const result = await runScoreCustomers();
    console.log(`[trigger/score-customers] ${result.scored} client(s) scoré(s), ${result.errors} erreur(s)`);
    return result;
  },
});
