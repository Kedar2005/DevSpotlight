import { useState } from "react";
import { changePassword } from "../../api/user.api";
import { getErrorMessage } from "../../lib/errors";
import { getStoredUser, persistSession } from "../../services/auth.service";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Alert } from "../ui/alert";

const EMPTY = { oldPassword: "", newPassword: "", confirmPassword: "" };

export function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ tone: "", message: "" });
  const [saving, setSaving] = useState(false);

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.oldPassword) next.oldPassword = "Enter your current password.";
    if (form.newPassword.length < 8) next.newPassword = "Use at least 8 characters.";
    else if (form.newPassword === form.oldPassword) next.newPassword = "Choose a different password.";
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = "Passwords do not match.";
    setErrors(next);
    setStatus({ tone: "", message: "" });
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const { data, message } = await changePassword({
        oldPassword: form.oldPassword,
        newPassword: form.newPassword,
      });
      // Older tokens stop working after a password change; keep this tab signed in with the new one.
      persistSession({ token: data.accessToken, user: getStoredUser() });
      setForm(EMPTY);
      setStatus({ tone: "success", message });
    } catch (err) {
      setStatus({ tone: "error", message: getErrorMessage(err, "Couldn't change the password.") });
    } finally {
      setSaving(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <div className="space-y-1.5">
      <label htmlFor={`cp-${name}`} className="text-xs font-medium">
        {label}
      </label>
      <Input
        id={`cp-${name}`}
        name={name}
        type="password"
        autoComplete={autoComplete}
        value={form[name]}
        onChange={onChange}
        aria-invalid={Boolean(errors[name])}
        aria-describedby={errors[name] ? `cp-${name}-error` : undefined}
      />
      {errors[name] && (
        <p id={`cp-${name}-error`} className="text-xs text-destructive">
          {errors[name]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold">Change password</h2>
        <p className="text-xs text-muted-foreground">Other devices will be signed out.</p>
      </div>
      {status.message && <Alert tone={status.tone}>{status.message}</Alert>}
      {field("oldPassword", "Current password", "current-password")}
      {field("newPassword", "New password (at least 8 characters)", "new-password")}
      {field("confirmPassword", "Confirm new password", "new-password")}
      <Button type="submit" size="sm" disabled={saving} className="w-full">
        {saving ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}
