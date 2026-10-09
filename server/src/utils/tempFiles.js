import fs from "fs";

/** Best-effort removal of multer temp files when a request fails before upload. */
export const removeTempFiles = (files = []) => {
  const list = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of list) {
    if (file?.path) {
      fs.unlink(file.path, () => {});
    }
  }
};
