import http from "./http";

export const getTeammateRecommendations = async (projectId) => {
  const { data } = await http.get(`/projects/${projectId}/recommendations`);
  return data.data;
};

// Same endpoint, opt-in Gemini ranking. Only call on an explicit user action.
export const getAiTeammateRecommendations = async (projectId) => {
  const { data } = await http.get(`/projects/${projectId}/recommendations`, { params: { ai: 1 } });
  return data.data.ai;
};
