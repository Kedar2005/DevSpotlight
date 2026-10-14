import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Globe,
  ExternalLink,
  GitBranch,
  Search,
  RefreshCw,
  MapPin,
  Layers,
  ChevronLeft
} from "lucide-react";
import { getPublicShowcase } from "../../api/hackathon.api";

export default function PublicHackathonShowcase() {
  const [showcases, setShowcases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getPublicShowcase()
      .then((data) => {
        if (!active) return;
        setShowcases(data || []);
      })
      .catch((err) => {
        console.error("Failed to load public showcase:", err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const filtered = showcases.filter((item) => {
    const title = item.hackathon?.title?.toLowerCase() || "";
    const college = item.hackathon?.college?.name?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return title.includes(term) || college.includes(term);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-slate-950 border border-purple-500/20 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <Link
            to="/hackathons"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-white transition mb-2"
          >
            <ChevronLeft className="h-4 w-4" /> Discover Live Events
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Globe className="h-3.5 w-3.5 text-purple-400" />
            Public Collegiate Hall of Fame
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Hackathon Showcase & Winning Inventions
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Explore finalized projects, prototypes, and award-winning solutions published from completed collegiate hackathons.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search completed hackathons by name or college..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Showcase Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-purple-400" />
          <span className="text-sm font-medium">Loading published showcases...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-white/5 bg-slate-900/30 space-y-3">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No published showcases yet</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Once collegiate hackathons conclude, administrators publish their rooms to feature all winning projects here.
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {filtered.map((item) => {
            const h = item.hackathon || {};
            const subs = item.submissions || [];

            return (
              <div
                key={item._id}
                className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 sm:p-8 space-y-6 shadow-xl"
              >
                {/* Event header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300">
                        Completed & Published
                      </span>
                      {h.college && (
                        <span className="text-xs text-indigo-400 flex items-center gap-1 font-medium">
                          <MapPin className="h-3 w-3" />
                          {h.college?.name || h.college}
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white">
                      {h.title}
                    </h2>
                    <p className="text-xs text-slate-400 max-w-2xl">{h.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/hackathon/room/${item._id}`}
                      className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                    >
                      <Layers className="h-3.5 w-3.5 text-indigo-400" />
                      View Full Room
                    </Link>
                  </div>
                </div>

                {/* Submissions in this published showcase */}
                {subs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No individual project records attached to this showcase.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subs.map((sub) => {
                      const proj = sub.project || {};
                      return (
                        <div
                          key={sub._id}
                          className="p-5 rounded-2xl border border-white/10 bg-slate-950/60 flex flex-col justify-between space-y-4 hover:border-purple-500/30 transition shadow-md"
                        >
                          <div className="space-y-2">
                            <h3 className="text-base font-bold text-white">
                              {proj.title || "Untitled Project"}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-3">
                              {proj.description || "Hackathon project submission."}
                            </p>
                          </div>

                          <div className="space-y-3 pt-3 border-t border-white/5 text-xs">
                            <div className="text-slate-400 flex items-center justify-between">
                              <span>Creator:</span>
                              <span className="font-semibold text-white">
                                {sub.submittedBy?.fullName || sub.submittedBy?.userName || "Developer"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              {proj._id && (
                                <Link
                                  to={`/projects/${proj._id}`}
                                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-indigo-400 text-xs flex items-center gap-1 transition"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View Project
                                </Link>
                              )}
                              {proj.githubUrl && (
                                <a
                                  href={proj.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition"
                                  title="GitHub"
                                >
                                  <GitBranch className="h-3.5 w-3.5" />
                                </a>
                              )}
                              {sub.presentationUrl && (
                                <a
                                  href={sub.presentationUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-300 text-xs hover:bg-purple-500/20 transition flex items-center gap-1"
                                >
                                  <span>Deck</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
