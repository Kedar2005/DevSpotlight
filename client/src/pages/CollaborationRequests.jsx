import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, Send, RotateCw } from "lucide-react";
import { getReceivedRequests, getSentRequests } from "../api/collaboration.api";
import { getErrorMessage } from "../lib/errors";
import { cn } from "../lib/utils";
import { RequestItem } from "../components/shared/RequestItem";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";

const FILTERS = ["all", "pending", "approved", "rejected"];

export function CollaborationRequests() {
  const [tab, setTab] = useState("incoming");
  const [filter, setFilter] = useState("all");
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([getReceivedRequests(), getSentRequests()])
      .then(([received, mine]) => {
        if (!active) return;
        setIncoming(received);
        setSent(mine);
      })
      .catch((err) => active && setError(getErrorMessage(err, "Couldn't load collaboration requests.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setError("");
    setLoading(true);
    setReloadKey((key) => key + 1);
  };

  const replace = (setter) => (updated) =>
    setter((list) => list.map((item) => (item._id === updated._id ? updated : item)));
  const remove = (setter) => (id) => setter((list) => list.filter((item) => item._id !== id));

  const source = tab === "incoming" ? incoming : sent;
  const visible = filter === "all" ? source : source.filter((item) => item.status === filter);
  const count = (list, status) => list.filter((item) => item.status === status).length;
  const pendingIncoming = count(incoming, "pending");

  return (
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      {/* Page Title & Description */}
      <div className="flex flex-col gap-2 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Collaboration Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage student requests to collaborate on your repositories, and track your sent requests.
          </p>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={retry}
          disabled={loading}
          className="self-start sm:self-auto text-muted-foreground"
        >
          <RotateCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs: Incoming vs Sent */}
      <div className="my-6 border-b border-border">
        <div className="flex gap-2" role="tablist">
          {[
            {
              id: "incoming",
              label: "Incoming Requests",
              Icon: Inbox,
              badge: pendingIncoming ? `${pendingIncoming} pending` : null,
            },
            {
              id: "sent",
              label: "Sent Requests",
              Icon: Send,
              badge: null,
            },
          ].map(({ id, label, Icon, badge }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setFilter("all");
              }}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                tab === id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
              {badge && (
                <span className="rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Filter status pills */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground mr-1">Status:</span>
        {FILTERS.map((name) => {
          const itemCount = name === "all" ? source.length : count(source, name);
          const active = filter === name;
          return (
            <button
              key={name}
              onClick={() => setFilter(name)}
              aria-pressed={active}
              className={cn(
                "rounded border px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {name} ({itemCount})
            </button>
          );
        })}
      </div>

      {error ? (
        <Alert tone="error" className="mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button size="xs" variant="outline" onClick={retry}>
            Retry
          </Button>
        </Alert>
      ) : null}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-card p-4" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="font-semibold text-foreground text-sm">
            {source.length === 0
              ? tab === "incoming"
                ? "No incoming requests yet"
                : "You haven't requested to collaborate on any projects yet"
              : `No ${filter} requests`}
          </p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground leading-relaxed">
            {tab === "incoming"
              ? "When other student developers ask to collaborate on your projects, their requests will appear here."
              : "Browse projects in the feed and click 'Request Collaboration' on projects you want to contribute to."}
          </p>
          {tab === "sent" && source.length === 0 && (
            <div className="mt-5">
              <Button asChild size="sm">
                <Link to="/feed">Explore Projects</Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {visible.map((request) => (
            <RequestItem
              key={request._id}
              request={request}
              direction={tab}
              onUpdate={replace(tab === "incoming" ? setIncoming : setSent)}
              onRemove={remove(setSent)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
