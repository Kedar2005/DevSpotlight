import http from "./http";

export const getTeammateRecommendations = async (projectId) => {
  const { data } = await http.get(`/projects/${projectId}/recommendations`);
  return data.data;
};
