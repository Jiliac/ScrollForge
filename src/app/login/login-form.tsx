"use client";

import { useActionState, useRef } from "react";
import { login, signup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const [loginError, loginAction, loginPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await login(formData);
      return result?.error ?? null;
    },
    null,
  );

  const [signupError, signupAction, signupPending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const result = await signup(formData);
      return result?.error ?? null;
    },
    null,
  );

  const lastAction = useRef<"login" | "signup" | null>(null);
  const error =
    lastAction.current === "login"
      ? loginError
      : lastAction.current === "signup"
        ? signupError
        : null;
  const isPending = loginPending || signupPending;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Tales of the Golden Age</CardTitle>
        <CardDescription>
          Sign in to your account to continue your journey.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              formAction={loginAction}
              onClick={() => (lastAction.current = "login")}
              disabled={isPending}
              className="flex-1"
            >
              Sign in
            </Button>
            <Button
              formAction={signupAction}
              onClick={() => (lastAction.current = "signup")}
              disabled={isPending}
              variant="outline"
              className="flex-1"
            >
              Sign up
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
