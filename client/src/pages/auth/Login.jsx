import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Alert } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      // PublicRoute (App.jsx) redirects by the role the server returned.
      await login({ email, password });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to log in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Use the email and password you registered with.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">Email</label>
            <Input id="email" type="email" autoComplete="email" placeholder="you@college.edu"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/register" className="font-medium text-primary hover:underline">Create an account</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
