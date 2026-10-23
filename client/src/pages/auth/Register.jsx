import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Alert } from "../../components/ui/alert";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card";

// Same rules as server/src/utils/validators.js.
const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data) {
  const errors = {};
  if (!data.fullName.trim()) errors.fullName = "Enter your full name.";
  if (!USERNAME_PATTERN.test(data.userName.trim())) {
    errors.userName = "3–30 characters: lowercase letters, numbers, _ or .";
  }
  if (!EMAIL_PATTERN.test(data.email.trim())) errors.email = "Enter a valid email address.";
  if (data.password.length < 8) errors.password = "Use at least 8 characters.";
  if (data.confirmPassword !== data.password) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

function FieldError({ id, message }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

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
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: id === "userName" ? value.toLowerCase() : value }));
    setFieldErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  // Props that tie an input to its error message for screen readers.
  const errorProps = (id) =>
    fieldErrors[id] ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const errors = validate(formData);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    try {
      const payload = {
        fullName: formData.fullName.trim(),
        userName: formData.userName.trim(),
        email: formData.email.trim(),
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
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="fullName">Full name</label>
              <Input id="fullName" placeholder="Ada Lovelace" autoComplete="name" value={formData.fullName} onChange={handleChange} required {...errorProps("fullName")} />
              <FieldError id="fullName-error" message={fieldErrors.fullName} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="userName">Username</label>
              <Input id="userName" placeholder="adalovelace" autoComplete="username" value={formData.userName} onChange={handleChange} required {...errorProps("userName")} />
              <FieldError id="userName-error" message={fieldErrors.userName} />
              {!fieldErrors.userName && (
                <p className="text-xs text-muted-foreground">Lowercase letters, numbers, _ or . (3–30)</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="email">College or personal email</label>
            <Input id="email" type="email" placeholder="you@college.edu" autoComplete="email" value={formData.email} onChange={handleChange} required {...errorProps("email")} />
            <FieldError id="email-error" message={fieldErrors.email} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">Password</label>
              <Input id="password" type="password" autoComplete="new-password" value={formData.password} onChange={handleChange} required {...errorProps("password")} />
              <FieldError id="password-error" message={fieldErrors.password} />
              {!fieldErrors.password && <p className="text-xs text-muted-foreground">At least 8 characters</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="confirmPassword">Confirm password</label>
              <Input id="confirmPassword" type="password" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} required {...errorProps("confirmPassword")} />
              <FieldError id="confirmPassword-error" message={fieldErrors.confirmPassword} />
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
