import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Lock, CheckCircle2 } from "lucide-react";
import { resetPassword } from "../../api/auth.api";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";

export function ResetPassword() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) return setError("Password must be at least 8 characters long.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setSubmitting(true);
    try {
      await resetPassword({ token: token.trim(), password, confirmPassword });
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't reset your password."));
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="space-y-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 mb-1">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            Password Updated
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Your DevSpotlight account password has been successfully reset.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert tone="success">
            Your password was changed and any active sessions were signed out securely.
          </Alert>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full font-medium">
            <Link to="/login">Proceed to Log In</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="space-y-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground mb-1">
          <Lock className="h-5 w-5 stroke-[1.75]" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Set New Password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Choose a secure password with at least 8 characters.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}

          {!params.get("token") && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="token">
                Reset Token
              </label>
              <Input
                id="token"
                className="font-code text-xs bg-background"
                placeholder="Paste token from reset link"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="password">
              New Password
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-background"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-background"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" className="w-full font-medium" disabled={submitting}>
            {submitting ? "Updating Password..." : "Update Password"}
          </Button>

          <Link
            to="/forgot-password"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            Token expired or missing? Request a new one
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
