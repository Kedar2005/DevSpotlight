import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, KeyRound } from "lucide-react";
import { forgotPassword } from "../../api/auth.api";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setSubmitting(true);
    try {
      const response = await forgotPassword(email);
      const minutes = response.dev
        ? Math.max(1, Math.round((new Date(response.dev.expiresAt) - Date.now()) / 60000))
        : null;
      setResult({ ...response, minutes });
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't initiate password reset."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-border bg-card shadow-none">
      <CardHeader className="space-y-1">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted/50 text-foreground mb-1">
          <KeyRound className="h-5 w-5 stroke-[1.75]" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
          Forgot Password
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Enter your registered college or personal email to receive a password reset link.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}

          {result ? (
            <div className="space-y-3">
              <Alert tone={result.deliveryConfigured ? "success" : "warning"}>
                {result.message}
              </Alert>

              {result.dev ? (
                <div className="space-y-2 rounded-md border border-dashed border-border bg-muted/40 p-3 text-xs">
                  <p className="font-semibold text-foreground">Local Development Mode</p>
                  <p className="text-muted-foreground">
                    Email service is unconfigured locally. Use the simulated reset link below (expires in {result.minutes}m):
                  </p>
                  <Button asChild size="xs" className="mt-1">
                    <Link to={`/reset-password?token=${result.dev.resetToken}`}>
                      Proceed to Reset Password
                    </Link>
                  </Button>
                </div>
              ) : null}

              {!result.deliveryConfigured && !result.dev ? (
                <p className="text-xs text-muted-foreground">
                  Check your server terminal console for the generated reset token. Already have a token?{" "}
                  <Link className="font-medium text-primary hover:underline" to="/reset-password">
                    Enter it directly
                  </Link>.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground" htmlFor="email">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-background"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" className="w-full font-medium" disabled={submitting}>
            {submitting ? "Sending Reset Link..." : "Send Password Reset Link"}
          </Button>

          <Link
            to="/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Log In
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
