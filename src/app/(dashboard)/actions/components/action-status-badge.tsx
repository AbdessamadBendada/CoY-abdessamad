export type ActionStatus =
  | "PENDING"
  | "SENDING"
  | "SCHEDULED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "CLICKED"
  | "CONVERTED"
  | "FAILED"
  | "CANCELLED"
  | "NEEDS_REVIEW";

export type ActionChannel = "EMAIL" | "SMS";

const STATUS_CONFIG: Record<
  ActionStatus,
  { label: string; bg: string; color: string }
> = {
  PENDING:      { label: "En attente", bg: "rgba(122,99,85,0.08)",    color: "#7A6355" },
  SENDING:      { label: "En envoi…",  bg: "rgba(92,138,58,0.08)",    color: "#5C8A3A" },
  SCHEDULED:    { label: "Planifiée",  bg: "rgba(232,184,75,0.12)",   color: "#C99A30" },
  SENT:         { label: "Envoyée",    bg: "rgba(92,138,58,0.10)",    color: "#5C8A3A" },
  DELIVERED:    { label: "Délivrée",   bg: "rgba(92,138,58,0.10)",    color: "#5C8A3A" },
  OPENED:       { label: "Ouverte",    bg: "rgba(92,138,58,0.12)",    color: "#5C8A3A" },
  CLICKED:      { label: "Cliquée",    bg: "rgba(92,138,58,0.15)",    color: "#5C8A3A" },
  CONVERTED:    { label: "Convertie",  bg: "rgba(92,138,58,0.18)",    color: "#5C8A3A" },
  FAILED:       { label: "Échouée",    bg: "rgba(192,68,42,0.08)",    color: "#C0442A" },
  CANCELLED:    { label: "Annulée",    bg: "rgba(184,168,152,0.12)",  color: "#B8A898" },
  NEEDS_REVIEW: { label: "À vérifier", bg: "rgba(232,184,75,0.12)",  color: "#C99A30" },
};

const CHANNEL_CONFIG: Record<ActionChannel, { label: string; icon: string }> =
  {
    EMAIL: { label: "Email", icon: "✉" },
    SMS: { label: "SMS", icon: "💬" },
  };

export function ActionStatusBadge({ status }: { status: ActionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      style={{ background: config.bg, color: config.color }}
      className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
    >
      {config.label}
    </span>
  );
}

export function ActionChannelBadge({ channel }: { channel: ActionChannel }) {
  const config = CHANNEL_CONFIG[channel];
  return (
    <span className="text-xs text-muted-foreground font-medium">
      {config.icon} {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
