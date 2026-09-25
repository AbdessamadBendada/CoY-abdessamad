export const SECTOR_MODE = "Mode";
export const SECTOR_SPORT = "Sport & Outdoor";
export const SECTOR_DECORATION = "Décoration";
export const SECTOR_AUTRE = "Autre";

export const SECTORS = [SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION, SECTOR_AUTRE] as const;

export type Sector = (typeof SECTORS)[number];
