import { upload } from "../middlewares/multure.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
  updateProfile,
  changeCurrentPassword,
  removeUserAvatar,
  removeUserCoverImage,
  getMyProfile,
  getMyProjects,
  getMyFavoriteProjects,
  getMyContributedProjects,
  getPublicProfile,
} from "../controllers/user.controller.js";

import { Router } from "express";

const router = Router();

router.route("/update-profile").patch(
  verifyJWT,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  updateProfile
);
router.route("/change-password").patch(verifyJWT, changeCurrentPassword);

router.route("/remove-avatar").delete(verifyJWT, removeUserAvatar);
router.route("/remove-cover").delete(verifyJWT, removeUserCoverImage);
router.route("/my-profile").get(verifyJWT, getMyProfile);
router.route("/my-projects").get(verifyJWT, getMyProjects);
router.route("/my-favourites").get(verifyJWT, getMyFavoriteProjects);
router.route("/profile/:userName").get(getPublicProfile);
router.route("/my-contributions").get(verifyJWT, getMyContributedProjects);

export default router;
