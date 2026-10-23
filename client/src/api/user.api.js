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

// Returns fresh tokens for this session; older sessions are signed out by the server.
export const changePassword = async (payload) => {
  const { data } = await http.patch("/users/change-password", payload);
  return data;
};
