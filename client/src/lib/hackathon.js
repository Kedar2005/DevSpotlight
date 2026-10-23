// Labels and badge variants for hackathon event status (see HACKATHON_STATUSES on the server).
export const HACKATHON_STATUS = {
  draft: { label: "Draft", variant: "secondary" },
  upcoming: { label: "Upcoming", variant: "outline" },
  registration_open: { label: "Registration open", variant: "success" },
  ongoing: { label: "Active", variant: "default" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

// Room lifecycle and submission review states.
export const ROOM_STATUS = {
  upcoming: { label: "Upcoming", variant: "outline" },
  open: { label: "Room open", variant: "success" },
  completed: { label: "Completed", variant: "secondary" },
  archived: { label: "Archived", variant: "secondary" },
};

export const SUBMISSION_STATUS = {
  submitted: { label: "Pending review", variant: "warning" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

// Discovery filter groups: Upcoming / Active / Completed.
export const hackathonPhase = (status) =>
  status === "ongoing" ? "active" : ["completed", "cancelled"].includes(status) ? "completed" : "upcoming";

export const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
};

// Value for <input type="datetime-local"> in the viewer's local time.
export const toDateTimeInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
