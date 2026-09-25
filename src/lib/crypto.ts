import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ENCRYPTION_KEY doit être une chaîne hex de 64 caractères (32 bytes = AES-256)
// Générer avec : node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits — recommandé pour GCM
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer | null {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex) return null;
  if (hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY doit être une chaîne hex de 64 caractères (32 bytes)");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Chiffre une valeur en AES-256-GCM.
 * Retourne un string au format "iv:authTag:ciphertext" (tout en hex).
 * Si ENCRYPTION_KEY est absent (dev), retourne la valeur non chiffrée avec préfixe "plain:".
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[crypto] ENCRYPTION_KEY absent — valeur stockée en clair (dev uniquement)");
      return `plain:${plaintext}`;
    }
    throw new Error("ENCRYPTION_KEY manquant en production");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/**
 * Déchiffre une valeur produite par encrypt().
 * Gère le préfixe "plain:" pour la compatibilité dev.
 */
export function decrypt(ciphertext: string): string {
  // Compatibilité : valeurs non chiffrées (dev ou données migrées) — jamais en prod
  if (ciphertext.startsWith("plain:")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[crypto] Valeur non chiffrée (préfixe plain:) refusée en production");
    }
    return ciphertext.slice(6);
  }

  const key = getKey();
  if (!key) {
    if (process.env.NODE_ENV !== "production") {
      // En dev sans clé, on retourne tel quel (pourrait être une valeur ancienne)
      return ciphertext;
    }
    throw new Error("ENCRYPTION_KEY manquant en production");
  }

  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    // Valeur héritée non chiffrée — jamais acceptée en prod (2e porte de contournement)
    if (process.env.NODE_ENV === "production") {
      throw new Error("[crypto] Valeur mal formée (attendu iv:authTag:ciphertext) refusée en production");
    }
    return ciphertext;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
