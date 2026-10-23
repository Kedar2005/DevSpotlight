import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { ChevronLeft, CalendarDays, Users, DoorOpen, Settings2, CheckCircle2 } from "lucide-react";
import { getHackathonDetails, registerForHackathon, getPublicColleges } from "../../api/hackathon.api";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Alert } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Modal } from "../../components/ui/modal";
import { LoadingState, StatusPill } from "../../components/shared/PageState";

function Section({ title, children }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

// Explains why registration is closed, using the same rules as the server.
function closedReason(h) {
  if (h.status === "completed") return "This hackathon has ended.";
  if (h.status === "cancelled") return "This hackathon was cancelled.";
  if (h.registrationStartDate && new Date() < new Date(h.registrationStartDate)) {
    return `Registration opens ${formatDate(h.registrationStartDate, true)}.`;
  }
  if (new Date() > new Date(h.registrationDeadline)) return "The registration deadline has passed.";
  if (h.maximumParticipants && h.participantCount >= h.maximumParticipants) return "All places are taken.";
  return "Registration is not open.";
}

export default function HackathonDetails() {
  const { id } = useParams();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();

  const [hackathon, setHackathon] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [collegeId, setCollegeId] = useState("");
  const [acceptRules, setAcceptRules] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [registerSuccess, setRegisterSuccess] = useState("");

  useEffect(() => {
    let active = true;
    getHackathonDetails(id)
      .then((data) => {
        if (!active) return;
        setHackathon(data);
        setLoadError("");
      })
      .catch((err) => {
        if (active) setLoadError(getErrorMessage(err, "Failed to load hackathon."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  useEffect(() => {
    getPublicColleges()
      .then((data) => setColleges(data || []))
      .catch(() => setColleges([]));
  }, []);

  const openForm = () => {
    // Prefill the college from the profile: by reference, else by matching the profile college name.
    const profileCollege =
      colleges.find((c) => String(c._id) === String(user?.college)) ||
      colleges.find((c) => c.name.toLowerCase() === (user?.collegeName || "").trim().toLowerCase());
    setCollegeId(profileCollege?._id || "");
    setTeamName("");
    setAcceptRules(false);
    setRegisterError("");
    setFieldErrors({});
    setFormOpen(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const errors = {};
    if (hackathon.participationMode === "team" && !teamName.trim()) errors.teamName = "Enter your team name.";
    if (!acceptRules) errors.acceptRules = "Confirm that you meet the eligibility requirements and accept the rules.";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setRegistering(true);
    setRegisterError("");
    try {
      await registerForHackathon(hackathon._id, {
        teamName: teamName.trim() || undefined,
        collegeId: collegeId || undefined,
        acceptRules: true,
      });
      setFormOpen(false);
      setRegisterSuccess("Registration complete. Your hackathon room is now open.");
      // Re-read from the server so status, counts and room access reflect the saved record.
      setReloadKey((k) => k + 1);
    } catch (err) {
      setRegisterError(getErrorMessage(err, "Registration failed."));
    } finally {
      setRegistering(false);
    }
  };

  if (loading) return <LoadingState label="Loading hackathon…" />;

  if (loadError || !hackathon) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center">
        <Alert tone="error">{loadError || "Hackathon not found."}</Alert>
        <Button asChild variant="outline" size="sm">
          <Link to="/hackathons">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All hackathons
          </Link>
        </Button>
      </div>
    );
  }

  const h = hackathon;
  const isAdmin = user?.role === "admin";
  const roomId = h.room?._id;
  const canOpenRoom = roomId && (h.isRegistered || isAdmin || h.room?.visibility === "public");
  const rules = (h.rules || "").split("\n").map((r) => r.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/hackathons" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> All hackathons
        </Link>
        {isAdmin && (
          <Link to="/admin/hackathons" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <Settings2 className="h-4 w-4" aria-hidden="true" /> Manage
          </Link>
        )}
      </div>

      <header className="space-y-2 border-b border-border pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill map={HACKATHON_STATUS} status={h.status} />
          {h.visibility === "private" && <Badge variant="outline">Private</Badge>}
          {h.theme && <Badge variant="secondary">{h.theme}</Badge>}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{h.title}</h1>
        <p className="text-sm text-muted-foreground">
          Organized by {h.organizer}
          {h.participatingColleges?.length ? ` · ${h.participatingColleges.map((c) => c.name).join(", ")}` : ""}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="About">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{h.description}</p>
          </Section>

          <Section title="Eligibility">
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {h.eligibility || "Open to all registered DevSpotlight students."}
            </p>
          </Section>

          <Section title="Rules">
            {rules.length ? (
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">The organizers have not published rules yet.</p>
            )}
          </Section>
        </div>

        <aside className="order-first space-y-6 lg:order-none">
          <Section title="Registration">
            {registerSuccess && <Alert tone="success" className="mb-3">{registerSuccess}</Alert>}

            {h.isRegistered ? (
              <div className="space-y-3">
                <Button className="w-full" disabled>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Registered
                </Button>
                <dl className="space-y-1.5 text-sm">
                  {h.userRegistration?.teamName && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Team</dt>
                      <dd className="font-medium">{h.userRegistration.teamName}</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">College</dt>
                    <dd className="text-right font-medium">
                      {colleges.find((c) => String(c._id) === String(h.userRegistration?.college))?.name ||
                        user?.collegeName ||
                        "Not specified"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Registered on</dt>
                    <dd className="font-medium">{formatDate(h.userRegistration?.registeredAt, true)}</dd>
                  </div>
                </dl>
              </div>
            ) : isAdmin ? (
              <Alert tone="info">Administrators manage this hackathon and can open its room, but do not register as participants.</Alert>
            ) : !h.registrationOpen ? (
              <Alert tone="info">{closedReason(h)}</Alert>
            ) : !isAuthenticated ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Sign in with your student account to register.</p>
                <Button asChild className="w-full">
                  <Link to="/login" state={{ from: location.pathname }}>
                    Sign in to register
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Registration closes {formatDate(h.registrationDeadline, true)}.
                </p>
                <Button className="w-full" onClick={openForm}>
                  Register
                </Button>
              </div>
            )}

            {canOpenRoom && (
              <Button asChild variant="outline" className="mt-3 w-full">
                <Link to={`/hackathon/room/${roomId}`}>
                  <DoorOpen className="h-4 w-4" aria-hidden="true" />
                  {h.room?.visibility === "public" && !h.isRegistered && !isAdmin ? "View showcase room" : "Open hackathon room"}
                </Link>
              </Button>
            )}
          </Section>

          <Section title="Dates">
            <dl className="space-y-2 text-sm">
              {[
                ["Registration opens", h.registrationStartDate ? formatDate(h.registrationStartDate, true) : "Open now"],
                ["Registration closes", formatDate(h.registrationDeadline, true)],
                ["Event starts", formatDate(h.startDate, true)],
                ["Event ends / submissions due", formatDate(h.endDate, true)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </dt>
                  <dd className="text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Participation">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" aria-hidden="true" /> Registered
                </dt>
                <dd className="font-medium">
                  {h.participantCount}
                  {h.maximumParticipants ? ` / ${h.maximumParticipants}` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Format</dt>
                <dd className="font-medium">
                  {h.participationMode === "team" ? `Teams of up to ${h.maximumTeamSize}` : "Individual"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Submissions</dt>
                <dd className="font-medium">{h.submissionCount}</dd>
              </div>
            </dl>
          </Section>
        </aside>
      </div>

      <Modal
        open={formOpen}
        onClose={registering ? () => {} : () => setFormOpen(false)}
        title={`Register for ${h.title}`}
        description="Your name and email come from your profile."
      >
        <form onSubmit={handleRegister} className="space-y-3" noValidate>
          {registerError && <Alert tone="error">{registerError}</Alert>}
          <div className="space-y-1.5">
            <label htmlFor="reg-name" className="text-xs font-medium">Name</label>
            <Input id="reg-name" value={user?.fullName || user?.userName || ""} readOnly disabled />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="text-xs font-medium">Email</label>
            <Input id="reg-email" value={user?.email || ""} readOnly disabled />
            <p className="text-[11px] text-muted-foreground">
              To change these, update <Link to="/profile" className="text-primary hover:underline">your profile</Link>.
            </p>
          </div>
          {colleges.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="college" className="text-xs font-medium">College</label>
              <Select id="college" value={collegeId} onChange={(e) => setCollegeId(e.target.value)}>
                <option value="">Not listed / use my profile</option>
                {colleges.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {h.participationMode === "team" && (
            <div className="space-y-1.5">
              <label htmlFor="team-name" className="text-xs font-medium">Team name *</label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => {
                  setTeamName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, teamName: undefined }));
                }}
                maxLength={60}
                required
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.teamName)}
                aria-describedby={fieldErrors.teamName ? "team-name-error" : undefined}
              />
              {fieldErrors.teamName && (
                <p id="team-name-error" className="text-xs text-destructive">{fieldErrors.teamName}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Teams of up to {h.maximumTeamSize}. Teammates register separately with the same team name.
              </p>
            </div>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={acceptRules}
              onChange={(e) => {
                setAcceptRules(e.target.checked);
                setFieldErrors((prev) => ({ ...prev, acceptRules: undefined }));
              }}
              required
              aria-invalid={Boolean(fieldErrors.acceptRules)}
              aria-describedby={fieldErrors.acceptRules ? "accept-rules-error" : undefined}
            />
            <span>I meet the eligibility requirements and accept the rules of this hackathon. *</span>
          </label>
          {fieldErrors.acceptRules && (
            <p id="accept-rules-error" className="-mt-1 text-xs text-destructive">{fieldErrors.acceptRules}</p>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" size="sm" onClick={() => setFormOpen(false)} disabled={registering}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={registering}>
              {registering ? "Registering…" : "Submit registration"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
