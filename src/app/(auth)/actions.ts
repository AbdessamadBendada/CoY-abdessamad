"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/shared/auth/supabase/server";
import { createSupabaseAdminClient } from "@/shared/auth/supabase/admin";
import { prisma } from "@/shared/db/prisma";
import { SECTORS } from "@/config/sectors";

// ─── LOGIN ────────────────────────────────────────────
export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Veuillez remplir tous les champs." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Email ou mot de passe incorrect." };
    }
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Veuillez confirmer votre email avant de vous connecter.",
        code: "EMAIL_NOT_CONFIRMED",
      };
    }
    return { error: "Erreur de connexion. Veuillez réessayer." };
  }

  // Mettre à jour lastLoginAt
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await prisma.user.updateMany({
      where: { authUserId: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  revalidatePath("/", "layout");
  redirect("/overview");
}

// ─── REGISTER ─────────────────────────────────────────
export async function register(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const companyName = formData.get("companyName") as string;
  const firstName = formData.get("firstName") as string;
  const lastName = formData.get("lastName") as string;
  const gdprConsent = formData.get("gdprConsent");

  if (!email || !password || !companyName) {
    return { error: "Veuillez remplir tous les champs obligatoires." };
  }

  if (!gdprConsent) {
    return { error: "Vous devez accepter les CGV et la politique de confidentialité." };
  }

  if (password.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const sectorResult = z.enum(SECTORS).safeParse(formData.get("sector"));
  if (!sectorResult.success) {
    return { error: "Merci de sélectionner votre secteur d'activité." };
  }
  const sector = sectorResult.data;

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    console.error("Configuration rollback inscription indisponible:", error);
    return {
      error: "L'inscription est temporairement indisponible. Veuillez réessayer plus tard.",
    };
  }

  // Créer le compte Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: {
        first_name: firstName,
        last_name: lastName,
        company_name: companyName,
      },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    return { error: "Erreur lors de l'inscription. Veuillez réessayer." };
  }

  if (!authData.user) {
    return { error: "Erreur lors de la création du compte." };
  }

  // Créer le Tenant + User dans notre BDD
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const now = new Date();
  const trialEnds = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000); // 21 jours

  try {
    await prisma.tenant.create({
      data: {
        name: companyName,
        slug: `${slug}-${Date.now().toString(36)}`,
        email,
        sector,
        plan: "COY",
        status: "TRIAL",
        trialStartedAt: now,
        trialEndsAt: trialEnds,
        onboardingStep: 0,
        gdprConsentAt: now,
        users: {
          create: {
            authUserId: authData.user.id,
            email,
            firstName: firstName || null,
            lastName: lastName || null,
            role: "OWNER",
          },
        },
        quotaUsages: {
          create: {
            period: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
          },
        },
      },
    });
  } catch (dbError: unknown) {
    console.error("Erreur création tenant:", dbError);

    try {
      const { error: cleanupError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      if (cleanupError) throw cleanupError;
    } catch (cleanupError) {
      console.error("ERREUR CRITIQUE — rollback utilisateur Supabase impossible:", cleanupError);
      return {
        error:
          "Le compte n'a pas pu être finalisé. Contactez le support avant de réessayer.",
        code: "REGISTRATION_RECOVERY_REQUIRED",
      };
    }

    return { error: "Erreur lors de la création du compte. Veuillez réessayer." };
  }

  return {
    success: true,
    message:
      "Compte créé ! Vérifiez votre email pour confirmer votre inscription.",
  };
}

// ─── FORGOT PASSWORD ──────────────────────────────────
export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Veuillez saisir votre adresse email." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: "Erreur lors de l'envoi du lien. Veuillez réessayer." };
  }

  return {
    success: true,
    message:
      "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.",
  };
}

// ─── UPDATE PASSWORD (après reset) ────────────────────
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password") as string;

  if (!password || password.length < 8) {
    return {
      error: "Le mot de passe doit contenir au moins 8 caractères.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    if (error.message.includes("same password")) {
      return {
        error: "Le nouveau mot de passe doit être différent de l'ancien.",
      };
    }
    return { error: "Erreur lors de la mise à jour. Veuillez réessayer." };
  }

  return {
    success: true,
    message: "Mot de passe mis à jour avec succès !",
  };
}

// ─── RESEND CONFIRMATION EMAIL ────────────────────────
export async function resendConfirmationEmail(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Veuillez saisir votre adresse email." };
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: "Erreur lors de l'envoi. Veuillez réessayer dans quelques minutes." };
  }

  return {
    success: true,
    message: "Email de confirmation renvoyé ! Vérifiez votre boîte de réception.",
  };
}

// ─── LOGOUT ───────────────────────────────────────────
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
