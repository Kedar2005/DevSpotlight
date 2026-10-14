import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Calendar,
  Users,
  MapPin,
  Search,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Award
} from "lucide-react";
import { getHackathons } from "../../api/hackathon.api";

const STATUS_FILTERS = [
  { id: "all", label: "All Hackathons" },
  { id: "registration_open", label: "Registration Open" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ongoing", label: "Live / Ongoing" },
  { id: "completed", label: "Past / Completed" },
];

export default function HackathonDiscovery() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    getHackathons(statusFilter)
      .then((data) => {
        if (!active) return;
        setHackathons(data || []);
      })
      .catch((err) => {
        console.error("Failed to fetch hackathons:", err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const filteredHackathons = hackathons.filter((h) => {
    const matchesSearch =
      h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.college?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            DevSpotlight Collegiate Hackathons
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Build, Compete & Showcase Your Inventions
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Join inter-college innovation sprints, collaborate in private team rooms, and win awards for cutting-edge software and hardware projects.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/hackathons/showcase"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium text-sm transition flex items-center gap-2"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              Explore Public Showcase
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setLoading(true);
                setStatusFilter(tab.id);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                statusFilter === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-white border border-white/5 hover:border-white/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input & Refresh */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title, college, tech..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Hackathon Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-indigo-400" />
          <span className="text-sm font-medium">Discovering active hackathons...</span>
        </div>
      ) : filteredHackathons.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-white/5 bg-slate-900/30 space-y-3">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-white">No hackathons found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            {searchQuery
              ? `No hackathons matching "${searchQuery}". Try a different keyword.`
              : "There are currently no hackathons in this category. Check back soon!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHackathons.map((h) => {
            const isRegOpen = h.status === "registration_open";
            const isOngoing = h.status === "ongoing";
            const isCompleted = h.status === "completed";

            return (
              <div
                key={h._id}
                className="group relative flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 hover:bg-slate-900/80 hover:border-indigo-500/40 transition duration-300 overflow-hidden shadow-xl"
              >
                {/* Banner / Header Image */}
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  {h.bannerImage ? (
                    <img
                      src={h.bannerImage}
                      alt={h.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-indigo-950 via-slate-900 to-purple-950 flex items-center justify-center">
                      <Trophy className="h-16 w-16 text-indigo-500/20" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

                  {/* Badges on banner */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                        isRegOpen
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : isOngoing
                          ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                          : isCompleted
                          ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                          : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                      }`}
                    >
                      {h.status?.replace("_", " ")}
                    </span>

                    <span className="text-[11px] font-semibold text-slate-300 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md">
                      {h.mode?.toUpperCase()}
                    </span>
                  </div>

                  {h.college && (
                    <div className="absolute bottom-3 left-3 text-xs text-indigo-300 flex items-center gap-1 font-medium bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg">
                      <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                      {h.college?.name || h.college}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition leading-snug">
                      {h.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {h.description || "Join this hackathon to collaborate and solve real-world problems."}
                    </p>

                    {/* Tags */}
                    {h.tags && h.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {h.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 border border-white/5 text-slate-300"
                          >
                            #{tag}
                          </span>
                        ))}
                        {h.tags.length > 3 && (
                          <span className="text-[10px] text-slate-500 self-center">
                            +{h.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Metadata & Footer */}
                  <div className="space-y-3 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{h.startDate ? new Date(h.startDate).toLocaleDateString() : "TBD"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                        <span>{h.registeredCount || 0} Registered</span>
                      </div>
                    </div>

                    {/* Prize highlight if present */}
                    {h.prizes && h.prizes.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Award className="h-4 w-4 text-amber-400" />
                          Prize Pool:
                        </span>
                        <span className="font-bold text-amber-200">
                          {h.prizes[0]?.amount || "Exciting Swag & Prizes"}
                        </span>
                      </div>
                    )}

                    {/* CTA Button */}
                    <Link
                      to={`/hackathon/${h._id}`}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20 cursor-pointer"
                    >
                      <span>View Event & Register</span>
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
