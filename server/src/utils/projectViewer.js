import { Like } from "../models/like.model.js";
import { CollaborationRequest } from "../models/collaborationRequest.model.js";

/**
 * Adds viewer-specific fields to a list of project payloads:
 *   likedByMe      - has the signed-in viewer liked it
 *   collaboration  - the viewer's most recent collaboration request for it, or null
 * Guests (no viewerId) always get false / null.
 */
export const attachViewerState = async (projects, viewerId) => {
  if (!projects.length) return projects;

  if (!viewerId) {
    return projects.map((project) => ({
      ...project,
      likedByMe: false,
      collaboration: null,
    }));
  }

  const projectIds = projects.map((project) => project._id);

  const [likes, requests] = await Promise.all([
    Like.find({ project: { $in: projectIds }, likeBy: viewerId })
      .select("project")
      .lean(),
    CollaborationRequest.find({ project: { $in: projectIds }, sender: viewerId })
      .sort({ createdAt: -1 })
      .select("project status")
      .lean(),
  ]);

  const likedSet = new Set(likes.map((like) => String(like.project)));
  const latestRequest = new Map();
  for (const request of requests) {
    const key = String(request.project);
    if (!latestRequest.has(key)) {
      latestRequest.set(key, { _id: request._id, status: request.status });
    }
  }

  return projects.map((project) => ({
    ...project,
    likedByMe: likedSet.has(String(project._id)),
    collaboration: latestRequest.get(String(project._id)) ?? null,
  }));
};

/** Like and comment totals for a set of project ids, as Map<projectId, number>. */
export const getEngagementCounts = async (projectIds, { Like, Comment }) => {
  const [likes, comments] = await Promise.all([
    Like.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: "$project", count: { $sum: 1 } } },
    ]),
    Comment.aggregate([
      { $match: { project: { $in: projectIds } } },
      { $group: { _id: "$project", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    likeMap: new Map(likes.map((entry) => [String(entry._id), entry.count])),
    commentMap: new Map(comments.map((entry) => [String(entry._id), entry.count])),
  };
};
