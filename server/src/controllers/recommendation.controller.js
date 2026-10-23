import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandlers.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";
import { CollaborationRequest } from "../models/collaborationRequest.model.js";
import { getProjectCollaborators } from "../utils/projectMembers.js";
import { getAiRecommendations } from "../utils/aiRecommendation.js";

/**
 * Returns student recommendations for a project based on required skills.
 *
 * Rules:
 * - Verifies project ownership (403 for non-owners).
 * - Excludes the logged-in user from the candidate list.
 * - Excludes banned users.
 * - Returns only safe, public profile information.
 * - Matches project required skills with student skills case-insensitively.
 * - Calculates match percentage based on matching required skills.
 * - Includes existing collaboration request status.
 * - Handles projects with empty or missing required skills.
 * - With ?ai=1 also asks Gemini to rank eligible students (see aiRecommendation.js).
 */
export const getTeammateRecommendations = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const wantAi = req.query.ai === "1";

  if (!mongoose.isValidObjectId(projectId)) {
    throw new ApiError(400, "Invalid project id");
  }

  const project = await Project.findById(projectId).select(
    "title description category techStack requiredSkills userId isDeleted"
  );

  if (!project || project.isDeleted) {
    throw new ApiError(404, "Project not found or unavailable");
  }

  // Only the project owner can view teammate recommendations.
  if (String(project.userId) !== String(req.user._id)) {
    throw new ApiError(
      403,
      "Only the project owner can view teammate recommendations"
    );
  }

  // Normalize and deduplicate required skills.
  const rawRequiredSkills = Array.isArray(project.requiredSkills)
    ? project.requiredSkills
    : [];

  const normalizedRequiredMap = new Map();

  rawRequiredSkills.forEach((skill) => {
    const trimmed = typeof skill === "string" ? skill.trim() : `${skill}`.trim();

    if (trimmed) {
      const lower = trimmed.toLowerCase();

      if (!normalizedRequiredMap.has(lower)) {
        normalizedRequiredMap.set(lower, trimmed);
      }
    }
  });

  const uniqueRequiredSkills = Array.from(normalizedRequiredMap.values());
  const totalRequired = uniqueRequiredSkills.length;

  // Handle projects without required skills.
  // AI ranking still works from the description and tech stack, so only the plain view stops here.
  if (totalRequired === 0 && !wantAi) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          project: {
            _id: project._id,
            title: project.title,
            category: project.category,
            requiredSkills: [],
          },
          totalRequired: 0,
          recommendations: [],
          hasRequiredSkills: false,
          message:
            "No required skills specified for this project. Add required skills to find suitable teammates.",
        },
        "No required skills configured for this project"
      )
    );
  }

  // Fetch other active student profiles and existing collaboration requests.
  const [students, collaborationRequests] = await Promise.all([
    User.find({
      _id: { $ne: req.user._id },
      isBanned: { $ne: true },
      isSuspended: { $ne: true },
    })
      .select("userName fullName avatar bio skills githubLink createdAt")
      .lean(),

    CollaborationRequest.find({
      project: project._id,
    })
      .select("sender receiver status createdAt respondedAt")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  // Keep the latest collaboration request for each candidate student.
  const requestStatusMap = new Map();

  collaborationRequests.forEach((request) => {
    const candidateId =
      String(request.sender) === String(project.userId)
        ? String(request.receiver)
        : String(request.sender);

    if (!requestStatusMap.has(candidateId)) {
      requestStatusMap.set(candidateId, {
        _id: request._id,
        status: request.status,
        createdAt: request.createdAt,
        respondedAt: request.respondedAt,
      });
    }
  });

  // Calculate matching and missing skills for each student.
  const recommendations = students.map((student) => {
    const studentRawSkills = Array.isArray(student.skills)
      ? student.skills
      : [];

    const studentSkillSet = new Set();
    const studentSkillsClean = [];

    studentRawSkills.forEach((skill) => {
      const trimmed =
        typeof skill === "string" ? skill.trim() : `${skill}`.trim();

      if (trimmed) {
        studentSkillsClean.push(trimmed);
        studentSkillSet.add(trimmed.toLowerCase());
      }
    });

    const matchingSkills = [];
    const missingSkills = [];

    for (const [lowerRequired, displayRequired] of normalizedRequiredMap) {
      if (studentSkillSet.has(lowerRequired)) {
        matchingSkills.push(displayRequired);
      } else {
        missingSkills.push(displayRequired);
      }
    }

    const matchPercentage = totalRequired
      ? Math.round((matchingSkills.length / totalRequired) * 100)
      : 0;

    const existingRequest = requestStatusMap.get(String(student._id)) || null;

    return {
      _id: student._id,
      userName: student.userName,
      fullName: student.fullName,
      avatar: student.avatar,
      bio: student.bio,
      skills: studentSkillsClean,
      githubLink: student.githubLink || "",
      matchingSkills,
      missingSkills,
      matchPercentage,
      collaborationStatus: existingRequest?.status || null,
      collaborationRequest: existingRequest,
    };
  });

  // Only recommend students who match at least one required skill.
  const matchingRecommendations = recommendations.filter(
    (student) => student.matchingSkills.length > 0
  );

  // Sort by match percentage, matching skill count, then name.
  matchingRecommendations.sort((a, b) => {
    if (b.matchPercentage !== a.matchPercentage) {
      return b.matchPercentage - a.matchPercentage;
    }

    if (b.matchingSkills.length !== a.matchingSkills.length) {
      return b.matchingSkills.length - a.matchingSkills.length;
    }

    return (a.fullName || a.userName).localeCompare(
      b.fullName || b.userName
    );
  });

  let ai;
  if (wantAi) {
    // Members and anyone with a pending/approved request are never sent to the model.
    const collaborators = await getProjectCollaborators(project._id, project.userId, "skills");
    const memberIds = new Set(collaborators.map((member) => String(member._id)));
    const eligible = recommendations.filter(
      (student) =>
        !memberIds.has(String(student._id)) &&
        !["pending", "approved"].includes(student.collaborationStatus)
    );
    const teamSkills = [req.user.skills, ...collaborators.map((member) => member.skills)].flat().filter(Boolean);
    ai = await getAiRecommendations(project, teamSkills, eligible);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project: {
          _id: project._id,
          title: project.title,
          category: project.category,
          requiredSkills: uniqueRequiredSkills,
        },
        totalRequired,
        totalEligibleStudents: students.length,
        hasRequiredSkills: totalRequired > 0,
        recommendations: matchingRecommendations,
        ...(ai && { ai }),
      },
      "Teammate recommendations fetched successfully"
    )
  );
});