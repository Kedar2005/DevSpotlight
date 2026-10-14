import http from "./http";

export const sendCollaborationRequest = async (projectId, message = "", recipientId = null) => {
  const payload = { projectId, message };
  if (recipientId) {
    payload.recipientId = recipientId;
  }
  const { data } = await http.post("/collaboration-requests", payload);
  return data.data;
};

export const getReceivedRequests = async (status) => {
  const { data } = await http.get("/collaboration-requests/received", {
    params: { status: status || undefined },
  });
  return data.data;
};

export const getSentRequests = async (status) => {
  const { data } = await http.get("/collaboration-requests/sent", {
    params: { status: status || undefined },
  });
  return data.data;
};

export const approveCollaborationRequest = async (requestId) => {
  const { data } = await http.put(`/collaboration-requests/${requestId}/approve`);
  return data.data;
};

export const rejectCollaborationRequest = async (requestId) => {
  const { data } = await http.put(`/collaboration-requests/${requestId}/reject`);
  return data.data;
};

export const withdrawCollaborationRequest = async (requestId) => {
  const { data } = await http.delete(`/collaboration-requests/${requestId}`);
  return data.data;
};
