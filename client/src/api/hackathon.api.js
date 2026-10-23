import http from "./http";

export const getHackathons = async (status) => {
  const { data } = await http.get("/hackathons", {
    params: status && status !== "all" ? { status } : {},
  });
  return data.data;
};

export const getHackathonDetails = async (idOrSlug) => {
  const { data } = await http.get(`/hackathons/${idOrSlug}`);
  return data.data;
};

export const registerForHackathon = async (hackathonId, payload = {}) => {
  const { data } = await http.post(`/hackathons/${hackathonId}/register`, payload);
  return data.data;
};

export const getHackathonRoom = async (roomId) => {
  const { data } = await http.get(`/hackathons/rooms/${roomId}`);
  return data.data;
};

export const getRoomSubmissions = async (roomId) => {
  const { data } = await http.get(`/hackathons/rooms/${roomId}/submissions`);
  return data.data;
};

export const submitProjectToRoom = async (roomId, payload) => {
  const { data } = await http.post(`/hackathons/rooms/${roomId}/submissions`, payload);
  return data.data;
};

export const getPublicShowcase = async () => {
  const { data } = await http.get("/hackathons/showcase");
  return data.data;
};

export const getPublicColleges = async () => {
  const { data } = await http.get("/hackathons/colleges");
  return data.data;
};

export const getMyHackathons = async () => {
  const { data } = await http.get("/hackathons/mine");
  return data.data;
};
