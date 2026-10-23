import { useAuth } from "../../hooks/useAuth";
import { PageHeader } from "../../components/shared/PageState";
import { ChangePasswordForm } from "../../components/shared/ChangePasswordForm";

const POLICIES = [
  {
    title: "Roles",
    body: "New accounts are always students; any role sent during registration or profile updates is ignored. Every /api/v1/admin route checks the JWT and the admin role on the server.",
  },
  {
    title: "Suspensions",
    body: "Suspended accounts cannot sign in or call protected APIs. The last active administrator cannot be suspended.",
  },
  {
    title: "Project moderation",
    body: "Moderated projects are hidden, not deleted, and keep who moderated them and why.",
  },
  {
    title: "Hackathon rooms",
    body: "Rooms are private to registered participants and admins. A room can be published only after its hackathon is completed, and the showcase lists only accepted submissions. Unpublishing or archiving removes it from public view immediately.",
  },
];

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your administrator account and how platform access is enforced." />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="admin-account">
        <h2 id="admin-account" className="mb-3 text-sm font-semibold">Administrator account</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Name</dt>
            <dd className="font-medium">{user?.fullName || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Username</dt>
            <dd className="font-medium">@{user?.userName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Role</dt>
            <dd className="font-medium capitalize">{user?.role}</dd>
          </div>
        </dl>
      </section>

      <ChangePasswordForm />

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="access-rules">
        <h2 id="access-rules" className="mb-3 text-sm font-semibold">Access rules</h2>
        <dl className="space-y-3">
          {POLICIES.map((p) => (
            <div key={p.title}>
              <dt className="text-sm font-medium">{p.title}</dt>
              <dd className="text-sm text-muted-foreground">{p.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card p-4" aria-labelledby="add-admin">
        <h2 id="add-admin" className="mb-2 text-sm font-semibold">Adding an administrator</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Admin roles are changed only from the server, never from the web app. The script only reports unless you add an
          action, and it never changes an existing password. Admin accounts cannot register for hackathons, so use a
          separate admin account rather than a personal student account.
        </p>
        <pre className="overflow-x-auto rounded-md border border-border bg-muted/50 p-3 font-code text-xs">
          {[
            "cd server",
            "ADMIN_EMAIL=ops@college.edu npm run bootstrap:admin              # report only",
            "ADMIN_EMAIL=ops@college.edu ADMIN_USERNAME=ops ADMIN_PASSWORD=******** npm run bootstrap:admin -- --create",
            "ADMIN_EMAIL=ops@college.edu npm run bootstrap:admin -- --promote # existing account",
            "ADMIN_EMAIL=me@college.edu npm run bootstrap:admin -- --demote   # back to student",
          ].join("\n")}
        </pre>
      </section>
    </div>
  );
}
