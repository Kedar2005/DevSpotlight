// Turns an axios error into a message that is safe and useful to show to a person.
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.request && !error.response) {
    return "Can't reach the server. Check your connection and that the backend is running.";
  }
  return fallback;
}
