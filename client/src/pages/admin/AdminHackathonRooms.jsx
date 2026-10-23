import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DoorOpen, Globe, Lock, Archive, ArchiveRestore, ExternalLink } from "lucide-react";
import { getAdminRooms, publishRoom, unpublishRoom, setRoomArchived } from "../../api/admin.api";
import { getErrorMessage } from "../../lib/errors";
import { HACKATHON_STATUS, ROOM_STATUS, formatDate } from "../../lib/hackathon";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Alert } from "../../components/ui/alert";
import { PageHeader, LoadingState, EmptyState, StatusPill, ConfirmDialog } from "../../components/shared/PageState";

const ACTIONS = {
  publish: {
    run: (room) => publishRoom(room._id),
    title: "Publish to the public showcase?",
    description:
      "Anyone will be able to see the hackathon details and its accepted submissions. Participant lists, notes and pending or rejected submissions stay private.",
    label: "Publish",
    done: "published",
  },
  unpublish: {
    run: (room) => unpublishRoom(room._id),
    title: "Unpublish this room?",
    description: "The room is removed from the public showcase immediately.",
    label: "Unpublish",
    destructive: true,
    done: "unpublished",
  },
  archive: {
    run: (room) => setRoomArchived(room._id, true),
    title: "Archive this room?",
    description: "Archived rooms are unpublished, read-only, and hidden from the showcase. You can restore them later.",
    label: "Archive",
    destructive: true,
    done: "archived",
  },
  restore: {
    run: (room) => setRoomArchived(room._id, false),
    title: "Restore this room?",
    description: "The room returns to the completed state. It stays private until you publish it.",
    label: "Restore",
    done: "restored",
  },
};

export default function AdminHackathonRooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState(null); // { room, action }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    getAdminRooms()
      .then((data) => {
        if (!active) return;
        setRooms(data || []);
        setError("");
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Failed to load hackathon rooms."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const confirm = async () => {
    const action = ACTIONS[pending.action];
    setBusy(true);
    setActionError("");
    try {
      await action.run(pending.room);
      setNotice(`"${pending.room.title}" ${action.done}.`);
      setPending(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(getErrorMessage(err, "Action failed."));
    } finally {
      setBusy(false);
    }
  };

  const ask = (room, action) => {
    setActionError("");
    setPending({ room, action });
  };

  const current = pending ? ACTIONS[pending.action] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hackathon Rooms"
        description="Rooms stay private to participants and admins. Publish a completed hackathon's room to add it to the public showcase."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/hackathons/showcase" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View showcase
            </Link>
          </Button>
        }
      />

      {notice && (
        <Alert tone="success" className="flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button type="button" className="text-xs hover:underline" onClick={() => setNotice("")}>
            Dismiss
          </button>
        </Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <LoadingState label="Loading rooms…" />
        ) : rooms.length === 0 ? (
          <EmptyState icon={DoorOpen} title="No rooms yet" description="A room is created automatically with every hackathon." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Room</th>
                  <th className="px-4 py-2.5 font-medium">Hackathon status</th>
                  <th className="px-4 py-2.5 font-medium">Room status</th>
                  <th className="px-4 py-2.5 font-medium">Visibility</th>
                  <th className="px-4 py-2.5 font-medium">Members</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms.map((room) => {
                  const hackathonStatus = room.hackathon?.status;
                  const closed = ["completed", "cancelled"].includes(hackathonStatus);
                  const archived = room.status === "archived";
                  const isPublic = room.visibility === "public";
                  return (
                    <tr key={room._id} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{room.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(room.hackathon?.startDate)} – {formatDate(room.hackathon?.endDate)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill map={HACKATHON_STATUS} status={hackathonStatus} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill map={ROOM_STATUS} status={room.status} />
                      </td>
                      <td className="px-4 py-3">
                        {isPublic ? (
                          <Badge variant="success" className="gap-1">
                            <Globe className="h-3 w-3" aria-hidden="true" /> Published
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Lock className="h-3 w-3" aria-hidden="true" /> Private
                          </Badge>
                        )}
                        {room.publishedAt && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {formatDate(room.publishedAt)}
                            {room.publishedBy ? ` by ${room.publishedBy.fullName || room.publishedBy.userName}` : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {room.allowedParticipants?.length || 0} participants
                        <span className="block">{room.submissionCount} submissions</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button asChild variant="outline" size="xs">
                            <Link to={`/hackathon/room/${room._id}`}>Open</Link>
                          </Button>
                          {!archived &&
                            (isPublic ? (
                              <Button variant="outline" size="xs" onClick={() => ask(room, "unpublish")}>
                                <Lock className="h-3 w-3" aria-hidden="true" /> Unpublish
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                onClick={() => ask(room, "publish")}
                                disabled={hackathonStatus !== "completed"}
                                title={hackathonStatus !== "completed" ? "Mark the hackathon as completed first" : undefined}
                              >
                                <Globe className="h-3 w-3" aria-hidden="true" /> Publish
                              </Button>
                            ))}
                          {archived ? (
                            <Button variant="outline" size="xs" onClick={() => ask(room, "restore")}>
                              <ArchiveRestore className="h-3 w-3" aria-hidden="true" /> Restore
                            </Button>
                          ) : (
                            closed && (
                              <Button variant="outline" size="xs" onClick={() => ask(room, "archive")}>
                                <Archive className="h-3 w-3" aria-hidden="true" /> Archive
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={current?.title}
        description={current?.description}
        confirmLabel={current?.label}
        destructive={current?.destructive}
        busy={busy}
        error={actionError}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </div>
  );
}
