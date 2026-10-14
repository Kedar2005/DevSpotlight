import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Plus,
  Search,
  Filter,
  Users,
  Calendar,
  Clock,
  Layers,
  ExternalLink,
  Edit2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FileText,
  MapPin,
  Award
} from "lucide-react";
import {
  getAdminHackathons,
  createHackathon,
  updateHackathon,
  updateHackathonStatus,
  getHackathonParticipants,
  getHackathonSubmissions,
  getAdminColleges,
} from "../../api/admin.api";

const STATUS_CONFIG = {
  draft: { label: "Draft", bg: "bg-slate-500/10", border: "border-slate-500/20", text: "text-slate-400" },
  upcoming: { label: "Upcoming", bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  registration_open: { label: "Registration Open", bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  ongoing: { label: "Ongoing", bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400" },
  completed: { label: "Completed", bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
  cancelled: { label: "Cancelled", bg: "bg-rose-500/10", border: "border-rose-500/20", text: "text-rose-400" },
};

const ALL_STATUSES = ["draft", "upcoming", "registration_open", "ongoing", "completed", "cancelled"];

export default function AdminHackathons() {
  const [hackathons, setHackathons] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingHackathon, setEditingHackathon] = useState(null);
  const [participantsModal, setParticipantsModal] = useState({ open: false, hackathon: null, data: [], loading: false });
  const [submissionsModal, setSubmissionsModal] = useState({ open: false, hackathon: null, data: [], loading: false });

  // Form state
  const initialForm = {
    title: "",
    slug: "",
    description: "",
    bannerImage: "",
    college: "",
    mode: "hybrid",
    location: "",
    registrationStart: "",
    registrationEnd: "",
    startDate: "",
    endDate: "",
    maxParticipants: 100,
    tags: "",
    prizes: [{ name: "1st Place", amount: "₹25,000", description: "Winner grand prize" }]
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    Promise.all([
      getAdminHackathons(),
      getAdminColleges({ status: "active", limit: 100 })
    ])
      .then(([hData, cData]) => {
        if (!active) return;
        setHackathons(hData || []);
        setColleges(cData?.colleges || []);
      })
      .catch((err) => {
        if (!active) return;
        setActionError(err?.response?.data?.message || "Failed to load hackathons");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const fetchHackathons = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const handleOpenCreate = () => {
    setEditingHackathon(null);
    setFormData(initialForm);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHackathon(h);
    setFormData({
      title: h.title || "",
      slug: h.slug || "",
      description: h.description || "",
      bannerImage: h.bannerImage || "",
      college: h.college?._id || h.college || "",
      mode: h.mode || "hybrid",
      location: h.location || "",
      registrationStart: h.registrationStart ? new Date(h.registrationStart).toISOString().slice(0, 16) : "",
      registrationEnd: h.registrationEnd ? new Date(h.registrationEnd).toISOString().slice(0, 16) : "",
      startDate: h.startDate ? new Date(h.startDate).toISOString().slice(0, 16) : "",
      endDate: h.endDate ? new Date(h.endDate).toISOString().slice(0, 16) : "",
      maxParticipants: h.maxParticipants || 100,
      tags: Array.isArray(h.tags) ? h.tags.join(", ") : "",
      prizes: h.prizes && h.prizes.length > 0 ? h.prizes : [{ name: "1st Place", amount: "₹25,000", description: "" }]
    });
    setIsCreateOpen(true);
  };

  const handleSaveHackathon = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
        maxParticipants: Number(formData.maxParticipants) || 100,
        college: formData.college || undefined,
      };

      if (editingHackathon) {
        await updateHackathon(editingHackathon._id, payload);
        setActionSuccess(`Hackathon "${formData.title}" updated successfully.`);
      } else {
        await createHackathon(payload);
        setActionSuccess(`Hackathon "${formData.title}" created with provisioned private room.`);
      }

      setIsCreateOpen(false);
      fetchHackathons();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to save hackathon");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (hackathonId, newStatus) => {
    setActionError("");
    setActionSuccess("");
    try {
      await updateHackathonStatus(hackathonId, newStatus);
      setActionSuccess(`Status updated to "${newStatus.replace("_", " ")}".`);
      fetchHackathons();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to update status");
    }
  };

  const handleViewParticipants = async (h) => {
    setParticipantsModal({ open: true, hackathon: h, data: [], loading: true });
    try {
      const list = await getHackathonParticipants(h._id);
      setParticipantsModal({ open: true, hackathon: h, data: list || [], loading: false });
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to load participants");
      setParticipantsModal({ open: false, hackathon: null, data: [], loading: false });
    }
  };

  const handleViewSubmissions = async (h) => {
    setSubmissionsModal({ open: true, hackathon: h, data: [], loading: true });
    try {
      const list = await getHackathonSubmissions(h._id);
      setSubmissionsModal({ open: true, hackathon: h, data: list || [], loading: false });
    } catch (err) {
      setActionError(err?.response?.data?.message || "Failed to load submissions");
      setSubmissionsModal({ open: false, hackathon: null, data: [], loading: false });
    }
  };

  const addPrizeRow = () => {
    setFormData(prev => ({
      ...prev,
      prizes: [...prev.prizes, { name: "", amount: "", description: "" }]
    }));
  };

  const updatePrizeRow = (index, field, value) => {
    setFormData(prev => {
      const newPrizes = [...prev.prizes];
      newPrizes[index][field] = value;
      return { ...prev, prizes: newPrizes };
    });
  };

  const removePrizeRow = (index) => {
    setFormData(prev => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index)
    }));
  };

  const filtered = hackathons.filter(h => {
    const matchesStatus = statusFilter === "all" || h.status === statusFilter;
    const matchesSearch =
      h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.college?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.slug?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-400" />
            Hackathons Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create, monitor, and regulate collegiate hackathons and access-controlled rooms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchHackathons}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Hackathon
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError("")} className="text-rose-400 hover:text-white">&times;</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess("")} className="text-emerald-400 hover:text-white">&times;</button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-white/5">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by title, college, slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-slate-500 hidden sm:block" />
          {["all", ...ALL_STATUSES].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap capitalize transition ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Hackathons Table / Cards */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
          <span>Loading hackathons...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-white/5 bg-slate-900/30">
          <Trophy className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No hackathons found</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Try adjusting your search query or status filter."
              : "Get started by hosting your first collegiate hackathon."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((h) => {
            const statusCfg = STATUS_CONFIG[h.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={h._id}
                className="p-5 rounded-2xl border border-white/10 bg-slate-900/50 hover:border-white/20 transition flex flex-col lg:flex-row lg:items-center justify-between gap-5"
              >
                {/* Details */}
                <div className="space-y-2 max-w-2xl">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.border} ${statusCfg.text}`}>
                      {statusCfg.label}
                    </span>
                    <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold px-2 py-0.5 rounded bg-white/5">
                      {h.mode}
                    </span>
                    {h.college && (
                      <span className="text-xs text-indigo-400 flex items-center gap-1 font-medium">
                        <MapPin className="h-3 w-3" />
                        {h.college?.name || h.college}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white hover:text-indigo-400 transition">
                    {h.title}
                  </h3>

                  <p className="text-sm text-slate-400 line-clamp-2">
                    {h.description || "No description provided."}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-slate-400 pt-1 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      Starts: {h.startDate ? new Date(h.startDate).toLocaleDateString() : "TBD"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      Ends: {h.endDate ? new Date(h.endDate).toLocaleDateString() : "TBD"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      {h.registeredCount || 0} / {h.maxParticipants || "∞"} Registered
                    </span>
                    {h.room && (
                      <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Room: {h.room?.visibility || "private"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch lg:items-end xl:items-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  {/* Status Selector */}
                  <select
                    value={h.status}
                    onChange={(e) => handleStatusChange(h._id, e.target.value)}
                    className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {ALL_STATUSES.map(st => (
                      <option key={st} value={st}>
                        Status: {st.replace("_", " ")}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewParticipants(h)}
                      className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition"
                      title="View Participants"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Participants</span>
                    </button>

                    <button
                      onClick={() => handleViewSubmissions(h)}
                      className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center gap-1.5 transition"
                      title="View Submissions"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Submissions</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(h)}
                      className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                      title="Edit Hackathon"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <Link
                      to={`/hackathon/${h._id}`}
                      target="_blank"
                      className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-indigo-400 transition"
                      title="Public View"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-5 my-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-400" />
                {editingHackathon ? "Edit Hackathon" : "Create New Hackathon"}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveHackathon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hackathon Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Apex Collegiate Hack 2026"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="e.g. apex-hack-2026 (auto-generated if empty)"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    College Partner
                  </label>
                  <select
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">None / Open Platform Hackathon</option>
                    {colleges.map((col) => (
                      <option key={col._id} value={col._id}>
                        {col.name} ({col.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Event Mode
                  </label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="online">Online</option>
                    <option value="offline">In-Person (Offline)</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Campus Auditorium / Discord"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registration Start
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.registrationStart}
                    onChange={(e) => setFormData({ ...formData, registrationStart: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Registration Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.registrationEnd}
                    onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hackathon Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Hackathon End Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Participant Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="AI, Web3, EdTech, OpenSource"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Banner Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.bannerImage}
                    onChange={(e) => setFormData({ ...formData, bannerImage: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe problem statements, rules, eligibility, and expectations..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Prizes list */}
                <div className="sm:col-span-2 space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-400" />
                      Prize Pool
                    </label>
                    <button
                      type="button"
                      onClick={addPrizeRow}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Prize
                    </button>
                  </div>

                  {formData.prizes.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Title (1st, Best Design)"
                        value={p.name}
                        onChange={(e) => updatePrizeRow(idx, "name", e.target.value)}
                        className="w-1/3 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Amount/Reward"
                        value={p.amount}
                        onChange={(e) => updatePrizeRow(idx, "amount", e.target.value)}
                        className="w-1/3 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Short Note"
                        value={p.description}
                        onChange={(e) => updatePrizeRow(idx, "description", e.target.value)}
                        className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      />
                      {formData.prizes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePrizeRow(idx)}
                          className="text-rose-400 hover:text-rose-300 text-sm px-1"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingHackathon ? "Update Hackathon" : "Create Hackathon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PARTICIPANTS MODAL */}
      {participantsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-400" />
                  Registered Participants
                </h3>
                <p className="text-xs text-slate-400">
                  {participantsModal.hackathon?.title} ({participantsModal.data.length} registered)
                </p>
              </div>
              <button
                onClick={() => setParticipantsModal({ open: false, hackathon: null, data: [], loading: false })}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {participantsModal.loading ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading participants...
                </div>
              ) : participantsModal.data.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No participants registered yet.
                </div>
              ) : (
                participantsModal.data.map((reg) => (
                  <div
                    key={reg._id}
                    className="p-3 rounded-xl border border-white/5 bg-slate-950/60 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold flex items-center justify-center">
                        {reg.user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{reg.user?.name || "Unknown"}</div>
                        <div className="text-slate-400">@{reg.user?.username} • {reg.user?.email}</div>
                      </div>
                    </div>
                    <div className="text-right text-slate-400">
                      <div>Status: <span className="text-emerald-400 uppercase font-semibold">{reg.status}</span></div>
                      <div className="text-[10px]">{new Date(reg.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBMISSIONS MODAL */}
      {submissionsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-400" />
                  Hackathon Submissions
                </h3>
                <p className="text-xs text-slate-400">
                  {submissionsModal.hackathon?.title} ({submissionsModal.data.length} submitted)
                </p>
              </div>
              <button
                onClick={() => setSubmissionsModal({ open: false, hackathon: null, data: [], loading: false })}
                className="text-slate-400 hover:text-white text-xl"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {submissionsModal.loading ? (
                <div className="p-8 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />
                  Loading submissions...
                </div>
              ) : submissionsModal.data.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No projects submitted yet.
                </div>
              ) : (
                submissionsModal.data.map((sub) => (
                  <div
                    key={sub._id}
                    className="p-3.5 rounded-xl border border-white/5 bg-slate-950/60 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-white text-sm flex items-center gap-2">
                        {sub.project?.title || "Untitled Project"}
                        {sub.project?._id && (
                          <Link
                            to={`/projects/${sub.project._id}`}
                            target="_blank"
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                      <div className="text-slate-400">
                        Submitted by: <span className="text-slate-200">{sub.submittedBy?.name || "Participant"}</span>
                        {sub.teamMembers?.length > 0 && ` + ${sub.teamMembers.length} teammates`}
                      </div>
                      {sub.presentationUrl && (
                        <a
                          href={sub.presentationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline block"
                        >
                          Deck / Video: {sub.presentationUrl}
                        </a>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sub.status || "submitted"}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(sub.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
