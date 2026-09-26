import { schedules } from "@trigger.dev/sdk";
import { runTrialEmailSequence } from "@/features/messaging/lifecycle-email/trial-sequence";

export const trialEmailsTask = schedules.task({
  id: "trial-emails",
  cron: { pattern: "0 9 * * *", timezone: "Europe/Paris" },
  run: async () => {
    const result = await runTrialEmailSequence();
    console.log(
      `[trigger/trial-emails] ${result.sent} envoyé(s), ${result.skipped} ignoré(s), ${result.errors} erreur(s)`
    );
    return result;
  },
});
