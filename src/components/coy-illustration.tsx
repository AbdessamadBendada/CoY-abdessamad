import Image from "next/image";

export const COY_SCENES = [
  "enquete-sav",
  "radar-alerte",
  "chasse-clients",
  "collecte-data",
  "classification-risque",
  "redaction-message",
  "compte-rendu",
  "preuve-ca-sauve",
] as const;

export type CoyScene = (typeof COY_SCENES)[number];

interface CoyIllustrationProps {
  size?: number;
  className?: string;
  scene?: CoyScene | string;
}

export function CoyIllustration({ size = 40, className, scene }: CoyIllustrationProps) {
  return (
    <Image
      src="/images/coy-mascot.png"
      alt={scene ? `CoY — ${scene}` : "CoY"}
      width={size}
      height={size}
      className={className}
      style={{ objectFit: "contain" }}
      data-scene={scene ?? "default"}
    />
  );
}
