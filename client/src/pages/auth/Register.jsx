import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";

export function Register() {
  const [formData, setFormData] = useState({
    userName: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData((prev) => ({ ...prev, [e.target.id]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName,
        userName: formData.userName,
        email: formData.email,
        password: formData.password,
        bio: formData.bio,
      };
      await register(payload);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to create account"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your student account</CardTitle>
        <CardDescription>Publish your projects, discover peer builders, and collaborate.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="fullName">Full name</label>
              <Input id="fullName" placeholder="Ada Lovelace" autoComplete="name" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="userName">Username</label>
              <Input id="userName" placeholder="adalovelace" autoComplete="username" value={formData.userName} onChange={handleChange} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">College or personal email</label>
            <Input id="email" type="email" placeholder="you@college.edu" autoComplete="email" value={formData.email} onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input id="password" type="password" autoComplete="new-password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="bio">
              Short bio <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea id="bio" rows={2} placeholder="e.g. 3rd year CS student passionate about distributed systems and React." value={formData.bio} onChange={handleChange} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
