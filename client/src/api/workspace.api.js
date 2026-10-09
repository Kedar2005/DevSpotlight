import http from "./http";

export const getWorkspace = async (projectId) => {
  const { data } = await http.get(`/workspace/${projectId}`);
  return data.data;
};

export const createWorkspaceTask = async (projectId, taskData) => {
  const { data } = await http.post(`/workspace/${projectId}/tasks`, taskData);
  return data.data;
};

export const updateWorkspaceTask = async (projectId, taskId, updates) => {
  const { data } = await http.patch(`/workspace/${projectId}/tasks/${taskId}`, updates);
  return data.data;
};

export const deleteWorkspaceTask = async (projectId, taskId) => {
  const { data } = await http.delete(`/workspace/${projectId}/tasks/${taskId}`);
  return data.data;
};

export const getWorkspaceMessages = async (projectId) => {
  const { data } = await http.get(`/workspace/${projectId}/messages`);
  return data.data;
};

export const sendWorkspaceMessage = async (projectId, content) => {
  const { data } = await http.post(`/workspace/${projectId}/messages`, { content });
  return data.data;
};
