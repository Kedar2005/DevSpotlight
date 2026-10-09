import { useState } from "react";
import { X, UploadCloud, Info } from "lucide-react";
import { PROJECT_CATEGORIES } from "../../lib/constants";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Select } from "../ui/select";
import { Alert } from "../ui/alert";
import { Card, CardContent, CardFooter } from "../ui/card";
import { normalizeUrl } from "../../lib/utils";

const MAX_IMAGES = 6;

const Field = ({ id, label, required, hint, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

/**
 * Used for both creating and editing. `initial` holds the saved project when editing.
 * Calls onSubmit(FormData). On edit it sends `existingImages` (the URLs to keep) so the
 * owner can remove images; new files are sent as `images`.
 */
export function ProjectForm({ initial, submitLabel, submittingLabel, onSubmit, onCancel, error }) {
  const [values, setValues] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    category: initial?.category || "Web app",
    techStack: initial?.techStack?.join(", ") || "",
    githubLink: initial?.githubLink || "",
    liveLink: initial?.liveLink || "",
  });
  const [keptImages, setKeptImages] = useState(initial?.images || []);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(initial);
  const handleChange = (e) => setValues((prev) => ({ ...prev, [e.target.id]: e.target.value }));
  const imageCount = keptImages.length + files.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    const formattedValues = {
      ...values,
      githubLink: normalizeUrl(values.githubLink),
      liveLink: normalizeUrl(values.liveLink),
    };
    Object.entries(formattedValues).forEach(([key, value]) => payload.append(key, value));
    // `existingImages` is always sent on edit, even when empty, so removing all works.
    payload.append(isEdit ? "existingImages" : "images", JSON.stringify(keptImages));
    files.forEach((file) => payload.append("images", file));

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border border-border bg-card shadow-none">
        <CardContent className="space-y-6 pt-6">
          {error ? <Alert tone="error">{error}</Alert> : null}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              1. Project Information
            </h2>

            <Field id="title" label="Project Title" required hint="Max 120 characters">
              <Input
                id="title"
                required
                maxLength={120}
                placeholder="e.g. CampusCart – College Marketplace"
                value={values.title}
                onChange={handleChange}
                className="bg-background"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="category" label="Domain / Category" required>
                <Select id="category" value={values.category} onChange={handleChange} className="bg-background">
                  {PROJECT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                id="techStack"
                label="Technologies Used"
                required
                hint="Comma-separated"
              >
                <Input
                  id="techStack"
                  required
                  placeholder="React, Express, MongoDB, Tailwind"
                  value={values.techStack}
                  onChange={handleChange}
                  className="bg-background font-code text-xs"
                />
              </Field>
            </div>

            <Field id="description" label="Detailed Description" required hint="Markdown or plain text">
              <Textarea
                id="description"
                required
                rows={6}
                placeholder="Explain the problem you solved, how it works, features included, and any collaboration or feedback you're looking for..."
                value={values.description}
                onChange={handleChange}
                className="bg-background leading-relaxed"
              />
            </Field>
          </div>

          {/* Section 2: Links */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-bold text-foreground border-b border-border pb-2">
              2. Code & Deployment Links
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="githubLink" label="GitHub Repository" hint="Source code link">
                <Input
                  id="githubLink"
                  inputMode="url"
                  placeholder="https://github.com/username/project"
                  value={values.githubLink}
                  onChange={handleChange}
                  onBlur={() => {
                    if (values.githubLink?.trim()) {
                      setValues((prev) => ({ ...prev, githubLink: normalizeUrl(prev.githubLink) }));
                    }
                  }}
                  className="bg-background font-code text-xs"
                />
              </Field>

              <Field id="liveLink" label="Live Demo URL" hint="Vercel, Render, or Netlify">
                <Input
                  id="liveLink"
                  inputMode="url"
                  placeholder="https://myproject.vercel.app"
                  value={values.liveLink}
                  onChange={handleChange}
                  onBlur={() => {
                    if (values.liveLink?.trim()) {
                      setValues((prev) => ({ ...prev, liveLink: normalizeUrl(prev.liveLink) }));
                    }
                  }}
                  className="bg-background font-code text-xs"
                />
              </Field>
            </div>
          </div>

          {/* Section 3: Screenshots */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h2 className="text-sm font-bold text-foreground">
                3. Project Screenshots
              </h2>
              <span className="font-code text-xs text-muted-foreground">
                {imageCount} / {MAX_IMAGES} uploaded
              </span>
            </div>

            {keptImages.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Existing Screenshots:</p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {keptImages.map((url) => (
                    <li key={url} className="group relative overflow-hidden rounded-md border border-border bg-muted">
                      <img src={url} alt="Screenshot" className="aspect-video w-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => setKeptImages((list) => list.filter((item) => item !== url))}
                        className="absolute right-1.5 top-1.5 rounded bg-foreground/90 p-1 text-background opacity-90 transition-opacity hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="projectImages"
                className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.5]" />
                <span className="text-xs font-semibold text-foreground">
                  Click to select screenshots or drag and drop
                </span>
                <span className="text-[11px] text-muted-foreground mt-1">
                  PNG, JPG, or WEBP (up to {MAX_IMAGES} total images)
                </span>
                <input
                  id="projectImages"
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>

              {files.length > 0 && (
                <div className="flex items-center gap-2 rounded border border-border bg-muted/40 px-3 py-2 text-xs">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">
                    Selected {files.length} new {files.length === 1 ? "file" : "files"} to upload.
                  </span>
                  <button
                    type="button"
                    onClick={() => setFiles([])}
                    className="ml-auto text-xs text-destructive hover:underline"
                  >
                    Clear selection
                  </button>
                </div>
              )}

              {imageCount > MAX_IMAGES ? (
                <Alert tone="error">Maximum limit reached. Please remove {imageCount - MAX_IMAGES} image(s).</Alert>
              ) : null}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-border bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={submitting || imageCount > MAX_IMAGES}>
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
