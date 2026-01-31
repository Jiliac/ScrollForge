"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser } from "@/lib/auth";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: (formData.get("email") as string).trim(),
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  await getOrCreateUser();
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: (formData.get("email") as string).trim(),
    password: formData.get("password") as string,
  });

  if (error) {
    return { error: error.message };
  }

  await getOrCreateUser();
  redirect("/");
}
