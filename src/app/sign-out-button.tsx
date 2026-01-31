import { createClient } from "@/lib/supabase/server";
import { LogOutIcon } from "lucide-react";

export async function SignOutButton() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <div className="fixed top-4 right-16 h-9 z-50 flex items-center gap-3 text-sm text-muted-foreground">
      <span className="font-[family-name:var(--font-geist-mono)] text-xs">
        {user.email}
      </span>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="p-1.5 hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOutIcon className="size-4" />
        </button>
      </form>
    </div>
  );
}
