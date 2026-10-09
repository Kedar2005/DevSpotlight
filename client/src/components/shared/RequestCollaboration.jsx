import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Check, Clock, X } from "lucide-react";
import { sendCollaborationRequest } from "../../api/collaboration.api";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../lib/errors";
import { Button } from "../ui/button";
import { Modal } from "../ui/modal";
import { Textarea } from "../ui/textarea";
import { Alert } from "../ui/alert";

/**
 * "Request collaboration" button for someone else's project.
 *  - `collaboration` is the viewer's latest request ({ status }) or null; it comes from the API.
 *  - `onSent(request)` receives the request exactly as the backend saved it.
 */
export function RequestCollaboration({ project, collaboration, onSent, size = "default", className }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const status = collaboration?.status;

  if (status === "pending") {
    return (
      <Button variant="secondary" size={size} disabled className={className}>
        <Clock className="h-4 w-4" /> Request pending
      </Button>
    );
  }
  if (status === "approved") {
    return (
      <Button variant="secondary" size={size} disabled className={className}>
        <Check className="h-4 w-4 text-success" /> Collaborator
      </Button>
    );
  }

  const label = status === "rejected" ? "Request again" : "Request collaboration";

  const handleOpen = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    setError("");
    setOpen(true);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const saved = await sendCollaborationRequest(project._id, message);
      setOpen(false);
      setMessage("");
      onSent?.(saved);
    } catch (err) {
      setError(getErrorMessage(err, "Couldn't send the request."));
      // 409 means one already exists - the list on screen is stale, so refresh it.
      if (err.response?.status === 409) onSent?.({ status: "pending", _id: undefined });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button size={size} className={className} onClick={handleOpen}>
        <Users className="h-4 w-4" /> {label}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Request collaboration"
        description={`Ask to work on "${project.title}". The owner will see your message.`}
      >
        <form onSubmit={handleSend} className="space-y-4">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="space-y-1.5">
            <label htmlFor="collab-message" className="text-sm font-medium">
              Message <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="collab-message"
              rows={4}
              maxLength={500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="What would you like to work on? Mention your relevant skills."
            />
            <p className="text-right text-xs text-muted-foreground">{message.length}/500</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
