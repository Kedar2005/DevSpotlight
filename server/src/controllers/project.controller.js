import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { ApiError } from "../utils/apiError.js";
import { Project } from "../models/project.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { CollaborationRequest } from "../models/collaborationRequest.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import {
  escapeRegex,
  normalizeOptionalUrl,
  parseStringArray,
} from "../utils/validators.js";
import { removeTempFiles } from "../utils/tempFiles.js";
import { getProjectCollaborators } from "../utils/projectMembers.js";
import { attachViewerState, getEngagementCounts } from "../utils/projectViewer.js";
import { MAX_PROJECT_IMAGES, PROJECT_CATEGORIES } from "../constants.js";

const OWNER_FIELDS = "userName fullName avatar";

const buildProjectPayload = (project, extra = {}) => ({
  _id: project._id,
  title: project.title,
  description: project.description,
  category: project.category || "Other",
  techStack: project.techStack,
  requiredSkills: project.requiredSkills || [],
  githubLink: project.githubLink,
  liveLink: project.liveLink,
  images: project.images,
  userId: project.userId,
  visits: project.visits,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
  ...extra,
});

/** Returns the canonical category, undefined when not provided, or throws a 400. */
const parseCategory = (value) => {
  if (value === undefined || `${value}`.trim() === "") return undefined;

  const wanted = `${value}`.trim().toLowerCase();
  const match = PROJECT_CATEGORIES.find(
    (category) => category.toLowerCase() === wanted
  );

  if (!match) {
    throw new ApiError(
      400,
      `Category must be one of: ${PROJECT_CATEGORIES.join(", ")}`
    );
  }
  return match;
};

/** Parses the list of image URLs a client wants to keep (JSON array or comma list). */
const parseImageUrls = (value) => {
  let list = value;

  if (typeof value === "string" && value.trim().startsWith("[")) {
    try {
      list = JSON.parse(value);
    } catch {
      throw new ApiError(400, "Images must be a list of URLs");
    }
  }

  return parseStringArray(list).map((url) => normalizeOptionalUrl(url, "Image URL"));
};

const uploadProjectImages = async (files = []) => {
  const uploadedImages = await Promise.all(
    files.map(async (file) => {
      const upload = await uploadOnCloudinary(file.path);

      if (!upload?.secure_url) {
        throw new ApiError(500, `Image upload failed for ${file.originalname}`);
      }

      return upload.secure_url;
    })
  );

  return uploadedImages.filter(Boolean);
};

const createProject = asyncHandler(async (req, res) => {
  let fields;

  try {
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
      throw new ApiError(400, "Title and description are required");
    }

    const keptImages = parseImageUrls(req.body.images);
    if (keptImages.length + (req.files?.length ?? 0) > MAX_PROJECT_IMAGES) {
      throw new ApiError(400, `A project can have at most ${MAX_PROJECT_IMAGES} images`);
    }

    fields = {
      title: title.trim(),
      description: description.trim(),
      category: parseCategory(req.body.category),
      techStack: parseStringArray(req.body.techStack),
      requiredSkills: parseStringArray(req.body.requiredSkills),
      githubLink: normalizeOptionalUrl(req.body.githubLink, "GitHub URL"),
      liveLink: normalizeOptionalUrl(req.body.liveLink, "Live demo URL"),
      keptImages,
    };
  } catch (error) {
    removeTempFiles(req.files);
    throw error;
  }

  let imageUrls = [];
  if (req.files && req.files.length > 0) {
    imageUrls = await uploadProjectImages(req.files);
  }

  const { keptImages, ...projectFields } = fields;
  const project = await Project.create({
    ...projectFields,
    images: [...keptImages, ...imageUrls],
    userId: req.user._id,
  });

  const createdProject = await Project.findById(project._id).populate(
    "userId",
    OWNER_FIELDS
  );

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        buildProjectPayload(createdProject),
        "Project created successfully"
      )
    );
});

const getAllProjects = asyncHandler(async (req, res) => {
  const page = Math.max(Number.parseInt(req.query.page ?? "1", 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit ?? "6", 10) || 6, 1),
    24
  );
  const skip = (page - 1) * limit;
  const query = req.query.query?.trim();
  const category = parseCategory(req.query.category);
  const match = { isDeleted: { $ne: true } };

  if (query) {
    const pattern = escapeRegex(query);
    match.$or = [
      { title: { $regex: pattern, $options: "i" } },
      { description: { $regex: pattern, $options: "i" } },
      { techStack: { $elemMatch: { $regex: pattern, $options: "i" } } },
    ];
  }

  if (category) {
    match.category = category;
  }

  const [projects, total] = await Promise.all([
    Project.find(match)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", OWNER_FIELDS)
      .lean(),
    Project.countDocuments(match),
  ]);

  const projectIds = projects.map((project) => project._id);
  const { likeMap, commentMap } = await getEngagementCounts(projectIds, {
    Like,
    Comment,
  });

  const payloads = projects.map((project) =>
    buildProjectPayload(project, {
      likeCount: likeMap.get(String(project._id)) ?? 0,
      commentCount: commentMap.get(String(project._id)) ?? 0,
    })
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects: await attachViewerState(payloads, req.user?._id),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          hasNextPage: skip + limit < total,
          hasPreviousPage: page > 1,
        },
      },
      "Projects fetched successfully"
    )
  );
});

const getProjectById = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId).populate(
    "userId",
    "userName fullName avatar bio githubLink"
  );

  if (!project || (project.isDeleted && req.user?.role !== "admin")) {
    throw new ApiError(404, "Project not found or removed by moderation");
  }

  // $inc without timestamps so a page view doesn't look like an edit (updatedAt).
  await Project.updateOne(
    { _id: project._id },
    { $inc: { visits: 1 } },
    { timestamps: false }
  );

  const [likeCount, commentCount, collaborators] = await Promise.all([
    Like.countDocuments({ project: project._id }),
    Comment.countDocuments({ project: project._id }),
    getProjectCollaborators(project._id, project.userId?._id, OWNER_FIELDS),
  ]);

  const [payload] = await attachViewerState(
    [
      buildProjectPayload(project, {
        visits: project.visits + 1,
        likeCount,
        commentCount,
        collaborators,
      }),
    ],
    req.user?._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, payload, "Project fetched successfully"));
});

const updateProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  let project;
  const updates = {};
  let keptImages;

  try {
    if (!mongoose.isValidObjectId(projectId)) {
      throw new ApiError(400, "Invalid project id");
    }

    project = await Project.findById(projectId);
    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    // Only the owner may edit. Compared as strings because userId is an ObjectId.
    if (String(project.userId) !== String(req.user._id)) {
      throw new ApiError(403, "You are not allowed to update this project");
    }

    const body = req.body ?? {};

    if (body.title !== undefined) {
      if (!`${body.title}`.trim()) throw new ApiError(400, "Title can't be empty");
      updates.title = `${body.title}`.trim();
    }
    if (body.description !== undefined) {
      if (!`${body.description}`.trim()) {
        throw new ApiError(400, "Description can't be empty");
      }
      updates.description = `${body.description}`.trim();
    }

    const category = parseCategory(body.category);
    if (category) updates.category = category;

    if (body.githubLink !== undefined) {
      updates.githubLink = normalizeOptionalUrl(body.githubLink, "GitHub URL");
    }
    if (body.liveLink !== undefined) {
      updates.liveLink = normalizeOptionalUrl(body.liveLink, "Live demo URL");
    }
    if (body.techStack !== undefined) {
      updates.techStack = parseStringArray(body.techStack);
    }
    if (body.requiredSkills !== undefined) {
      updates.requiredSkills = parseStringArray(body.requiredSkills);
    }

    // `existingImages` is what the edit form sends: the URLs the owner chose to keep
    // (an empty list means "remove them all"). `images` is accepted for older clients.
    const imageInput = body.existingImages ?? body.images;
    keptImages =
      imageInput !== undefined ? parseImageUrls(imageInput) : [...project.images];

    if (keptImages.length + (req.files?.length ?? 0) > MAX_PROJECT_IMAGES) {
      throw new ApiError(400, `A project can have at most ${MAX_PROJECT_IMAGES} images`);
    }
  } catch (error) {
    removeTempFiles(req.files);
    throw error;
  }

  const uploadedImages = req.files?.length
    ? await uploadProjectImages(req.files)
    : [];

  project.set({ ...updates, images: [...keptImages, ...uploadedImages] });
  await project.save();

  const [updatedProject, likeCount, commentCount] = await Promise.all([
    Project.findById(project._id).populate("userId", OWNER_FIELDS),
    Like.countDocuments({ project: project._id }),
    Comment.countDocuments({ project: project._id }),
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        buildProjectPayload(updatedProject, { likeCount, commentCount }),
        "Project updated successfully"
      )
    );
});

const deleteProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId);
  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  if (String(project.userId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not allowed to delete this project");
  }

  await Promise.all([
    project.deleteOne(),
    Comment.deleteMany({ project: project._id }),
    Like.deleteMany({ project: project._id }),
    CollaborationRequest.deleteMany({ project: project._id }),
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Project deleted successfully"));
});

export {
  createProject,
  updateProject,
  deleteProject,
  getProjectById,
  getAllProjects,
};
