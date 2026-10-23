import { CollaborationRequest } from "../models/collaborationRequest.model.js";

/**
 * Approved collaborators of a project, each once, never the owner.
 * A request can go either way (student asks to join, or owner invites), so the
 * collaborator is whichever side of an approved request is not the owner.
 * Deleted users (failed populate) are skipped.
 */
export const getProjectCollaborators = async (projectId, ownerId, fields) => {
  const approved = await CollaborationRequest.find({ project: projectId, status: "approved" })
    .sort({ respondedAt: 1, createdAt: 1 })
    .populate("sender", fields)
    .populate("receiver", fields)
    .lean();

  const owner = String(ownerId);
  const byId = new Map();
  for (const request of approved) {
    const person = String(request.sender?._id) === owner ? request.receiver : request.sender;
    if (!person?._id || String(person._id) === owner || byId.has(String(person._id))) continue;
    byId.set(String(person._id), { ...person, since: request.respondedAt || request.updatedAt });
  }
  return [...byId.values()];
};
