import http from "./http";

export const updateProfile = async (payload) => {
  const { data } = await http.patch("/users/update-profile", payload);
  return data.data;
};

export const getPublicProfile = async (userName) => {
  const { data } = await http.get(`/users/profile/${encodeURIComponent(userName)}`);
  return data.data;
};

export const getMyCollaborations = async () => {
  const { data } = await http.get("/users/my-contributions");
  return data.data;
};
