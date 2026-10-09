import http from "./http";

export const getProjects = async ({ page = 1, limit = 6, query = "", category = "" } = {}) => {
  const { data } = await http.get("/projects", {
    params: { page, limit, query: query || undefined, category: category || undefined },
  });

  return data.data;
};

export const getProjectById = async (projectId) => {
  const { data } = await http.get(`/projects/${projectId}`);
  return data.data;
};

export const createProject = async (payload) => {
  const { data } = await http.post("/projects", payload);
  return data.data;
};

// Only the owner may do this; the server answers 403 for anyone else.
export const updateProject = async (projectId, payload) => {
  const { data } = await http.put(`/projects/${projectId}`, payload);
  return data.data;
};

export const getMyProjects = async () => {
  const { data } = await http.get("/users/my-projects");
  return data.data;
};

export const toggleProjectLike = async (projectId) => {
  const { data } = await http.post(`/likes/project/${projectId}`);
  return data.data;
};
