"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/auth";

function validateCredentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || !email.trim()) {
    return { error: "Email is required" } as const;
  }
  if (typeof password !== "string" || !password) {
    return { error: "Password is required" } as const;
  }

  return { email: email.trim(), password } as const;
}

export async function login(formData: FormData) {
  const credentials = validateCredentials(formData);
  if ("error" in credentials) {
    return { error: credentials.error };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  await getOrCreateUser();
  redirect("/");
}

export async function signup(formData: FormData) {
  const credentials = validateCredentials(formData);
  if ("error" in credentials) {
    return { error: credentials.error };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, user won't have a session yet
  if (data.user && !data.session) {
    return { error: "Check your email for a confirmation link." };
  }

  await getOrCreateUser();
  redirect("/");
}
