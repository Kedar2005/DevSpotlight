import http from "./http";

export const register = async (payload) => {
  const { data } = await http.post("/auth/register", payload);
  return data.data;
};

export const login = async (payload) => {
  const { data } = await http.post("/auth/login", payload);
  return data.data;
};

export const logout = async () => {
  const { data } = await http.post("/auth/logout");
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await http.get("/auth/me");
  return data.data;
};

// Returns { message, data } so the UI can show the server's own wording.
export const forgotPassword = async (email) => {
  const { data } = await http.post("/auth/forgot-password", { email });
  return { message: data.message, ...data.data };
};

export const resetPassword = async ({ token, password, confirmPassword }) => {
  const { data } = await http.post("/auth/reset-password", { token, password, confirmPassword });
  return data;
};
