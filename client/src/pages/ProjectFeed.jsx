import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, PlusCircle, XCircle } from "lucide-react";
import { getProjects } from "../api/project.api";
import { useAuth } from "../hooks/useAuth";
import { getErrorMessage } from "../lib/errors";
import { PROJECT_CATEGORIES } from "../lib/constants";
import { ProjectCard } from "../components/shared/ProjectCard";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";

const PAGE_SIZE = 12;

export function ProjectFeed() {
  const { token, isAuthenticated } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [params, setParams] = useState({ page: 1, query: "", category: "" });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false, total: 0 });

  useEffect(() => {
    let active = true;
    getProjects({ limit: PAGE_SIZE, ...params })
      .then((response) => {
        if (!active) return;
        setProjects(response.projects);
        setPagination(response.pagination);
        setError("");
      })
      .catch((err) => active && setError(getErrorMessage(err, "Couldn't load projects.")))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [params, token]);

  const go = (next) => {
    setLoading(true);
    setParams(next);
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    go({ page: 1, query: query.trim(), category });
  };

  const handleCategorySelect = (newCat) => {
    const selected = category === newCat ? "" : newCat;
    setCategory(selected);
    go({ page: 1, query: query.trim(), category: selected });
  };

  const resetFilters = () => {
    setQuery("");
    setCategory("");
    go({ page: 1, query: "", category: "" });
  };

  const patchProject = (id, patch) =>
    setProjects((list) => list.map((project) => (project._id === id ? { ...project, ...patch } : project)));

  return (
    <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
      {/* Feed Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Explore Projects</h1>
            <span className="rounded border border-border bg-muted px-2 py-0.5 font-code text-xs font-medium text-muted-foreground">
              {pagination.total || projects.length} {pagination.total === 1 ? "project" : "projects"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse software built by student developers across colleges. Filter by technology or domain.
          </p>
        </div>

        {isAuthenticated && (
          <Button asChild size="sm" className="self-start sm:self-auto font-medium">
            <Link to="/project/new">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              Publish Project
            </Link>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="my-6 space-y-3">
        <form onSubmit={applyFilters} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search projects"
              placeholder="Search by project name, tech stack (e.g. React, Python), or keywords..."
              className="pl-9 bg-card"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            aria-label="Category"
            className="sm:w-52 bg-card"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              go({ page: 1, query: query.trim(), category: e.target.value });
            }}
          >
            <option value="">All Categories</option>
            {PROJECT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Button type="submit" variant="secondary" className="font-medium">
            Search
          </Button>
          {(query || category) && (
            <Button type="button" variant="outline" onClick={resetFilters} title="Clear filters">
              <XCircle className="h-4 w-4 mr-1 text-muted-foreground" />
              Reset
            </Button>
          )}
        </form>

        {/* Quick category pill tags */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-muted-foreground font-medium mr-1">Categories:</span>
          <button
            type="button"
            onClick={() => handleCategorySelect("")}
            className={`rounded border px-2.5 py-1 text-xs transition-colors font-medium ${
              category === ""
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            All
          </button>
          {PROJECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategorySelect(cat)}
              className={`rounded border px-2.5 py-1 text-xs transition-colors font-medium ${
                category === cat
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error ? <Alert tone="error" className="mb-6">{error}</Alert> : null}

      {/* Grid or states */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 animate-pulse rounded-lg border border-border bg-card p-4 flex flex-col justify-between">
              <div className="aspect-[16/9] w-full rounded bg-muted" />
              <div className="space-y-2 mt-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
              <div className="h-8 w-full rounded bg-muted mt-4" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">No projects found</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
            {query || category
              ? "We couldn't find any projects matching your filters. Try clearing your search query or selecting another category."
              : "No student projects published yet. Be the first to share your college project!"}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {query || category ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear All Filters
              </Button>
            ) : isAuthenticated ? (
              <Button asChild size="sm">
                <Link to="/project/new">Create Project</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/register">Create an Account</Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project._id} project={project} onChange={(patch) => patchProject(project._id, patch)} />
            ))}
          </div>

          {pagination.totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground font-medium">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => go({ ...params, page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => go({ ...params, page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
