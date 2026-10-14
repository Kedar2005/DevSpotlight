import { useAuth } from "../../hooks/useAuth";
import {
  Settings,
  Shield,
  Key,
  Database,
  Lock,
  UserCheck,
  Terminal,
  CheckCircle2,
  Info
} from "lucide-react";

export default function AdminSettings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-400" />
          Platform Administration & Security Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review administrator credentials, platform security configurations, and operational policies.
        </p>
      </div>

      {/* Admin Profile Overview */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-400" />
          Active Administrator Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-slate-400">Full Name</span>
            <div className="font-semibold text-white text-sm">{user?.name || user?.fullName || "Admin"}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-slate-400">Username</span>
            <div className="font-semibold text-indigo-300 text-sm">@{user?.username || user?.userName}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-slate-400">Email Address</span>
            <div className="font-semibold text-white text-sm">{user?.email}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <span className="text-slate-400">Privilege Level</span>
            <div className="font-semibold text-emerald-400 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Role: {user?.role?.toUpperCase() || "ADMIN"} (Superuser)
            </div>
          </div>
        </div>
      </div>

      {/* Security Policies Matrix */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Lock className="h-5 w-5 text-indigo-400" />
          Security Architecture & Compliance Rules
        </h2>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-400" />
              Role-Based Access Control (RBAC)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Default registrations automatically assign the <code className="text-indigo-300">student</code> role. Public registration payloads requesting the <code className="text-amber-300">admin</code> role are strictly ignored by the authentication controller. All <code className="text-indigo-300">/api/v1/admin/*</code> routes enforce combined JWT verification and server-side <code className="text-indigo-300">requireAdmin</code> checks.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-400" />
              Suspension Enforcement & Last-Admin Guard
            </div>
            <p className="text-slate-400 leading-relaxed">
              Suspended users are blocked at the JWT middleware level with <code className="text-rose-300">403 Forbidden</code>, preventing any access to protected resources. The platform prevents suspension or deletion of the last remaining active administrator.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              Non-Destructive Project Moderation
            </div>
            <p className="text-slate-400 leading-relaxed">
              Reported or violating projects are soft-deleted via flag (<code className="text-amber-300">isDeleted: true</code>) alongside audit trails (<code className="text-amber-300">moderatedBy</code>, <code className="text-amber-300">moderationReason</code>). Soft-deleted projects are omitted from the public feed, search, and AI teammate recommendations.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-400" />
              Hackathon Room Visibility Governance
            </div>
            <p className="text-slate-400 leading-relaxed">
              Hackathon rooms are private by default, restricted exclusively to registered participants and admins. Publication to the Public Showcase requires the hackathon status to be officially marked as <code className="text-purple-300">completed</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Admin CLI Bootstrap Documentation */}
      <div className="p-6 rounded-2xl border border-white/10 bg-slate-900/50 space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Terminal className="h-5 w-5 text-indigo-400" />
          Admin CLI & Bootstrap Provisioning
        </h2>
        <p className="text-xs text-slate-400">
          In production environments, administrator roles should be provisioned securely via terminal scripts rather than web forms.
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 font-mono text-xs text-slate-300 space-y-2">
          <div className="text-slate-500">// Run from server directory:</div>
          <div className="text-indigo-400">npm run bootstrap:admin -- --email="user@domain.com"</div>
          <div className="text-slate-500">// Or provide ADMIN_EMAIL and ADMIN_PASSWORD in server/.env</div>
        </div>

        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-indigo-400" />
          <span>The bootstrap script safely promotes existing users or provisions an initial admin account without exposing credentials.</span>
        </div>
      </div>
    </div>
  );
}
