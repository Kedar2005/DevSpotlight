import http from "./http";

export const getAdminStats = async () => {
  const { data } = await http.get("/admin/stats");
  return data.data;
};

export const getAdminUsers = async (params = {}) => {
  const { data } = await http.get("/admin/users", { params });
  return data.data;
};

export const updateUserSuspension = async (userId, payload) => {
  const { data } = await http.patch(`/admin/users/${userId}/status`, payload);
  return data.data;
};

export const getUserProjects = async (userId) => {
  const { data } = await http.get(`/admin/users/${userId}/projects`);
  return data.data;
};

export const getAdminProjects = async (params = {}) => {
  const { data } = await http.get("/admin/projects", { params });
  return data.data;
};

export const moderateProject = async (projectId, payload) => {
  const { data } = await http.patch(`/admin/projects/${projectId}/moderation`, payload);
  return data.data;
};

export const getAdminColleges = async (params = {}) => {
  const { data } = await http.get("/admin/colleges", { params });
  return data.data;
};

export const createCollege = async (payload) => {
  const { data } = await http.post("/admin/colleges", payload);
  return data.data;
};

export const updateCollege = async (collegeId, payload) => {
  const { data } = await http.put(`/admin/colleges/${collegeId}`, payload);
  return data.data;
};

export const updateCollegeStatus = async (collegeId, status) => {
  const { data } = await http.patch(`/admin/colleges/${collegeId}/status`, { status });
  return data.data;
};

export const getAdminHackathons = async () => {
  const { data } = await http.get("/admin/hackathons");
  return data.data;
};

export const createHackathon = async (payload) => {
  const { data } = await http.post("/admin/hackathons", payload);
  return data.data;
};

export const updateHackathon = async (hackathonId, payload) => {
  const { data } = await http.put(`/admin/hackathons/${hackathonId}`, payload);
  return data.data;
};

export const updateHackathonStatus = async (hackathonId, status) => {
  const { data } = await http.patch(`/admin/hackathons/${hackathonId}/status`, { status });
  return data.data;
};

export const getHackathonParticipants = async (hackathonId) => {
  const { data } = await http.get(`/admin/hackathons/${hackathonId}/participants`);
  return data.data;
};

export const getHackathonSubmissions = async (hackathonId) => {
  const { data } = await http.get(`/admin/hackathons/${hackathonId}/submissions`);
  return data.data;
};

export const getAdminRooms = async () => {
  const { data } = await http.get("/admin/rooms");
  return data.data;
};

export const publishRoom = async (roomId) => {
  const { data } = await http.patch(`/admin/rooms/${roomId}/publish`);
  return data.data;
};

export const unpublishRoom = async (roomId) => {
  const { data } = await http.patch(`/admin/rooms/${roomId}/unpublish`);
  return data.data;
};

export const getAdminReports = async () => {
  const { data } = await http.get("/admin/reports");
  return data.data;
};
