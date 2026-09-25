import { schedules } from "@trigger.dev/sdk";
import { runDpaReminderSequence } from "@/lib/email/dpa-reminder";

export const remindDpaSignatureTask = schedules.task({
  id: "remind-dpa-signature",
  cron: { pattern: "0 9 * * *", timezone: "Europe/Paris" },
  run: async () => {
    const result = await runDpaReminderSequence();
    console.log(
      `[trigger/remind-dpa-signature] ${result.sent} envoyé(s), ${result.skipped} ignoré(s), ${result.errors} erreur(s)`
    );
    return result;
  },
});
