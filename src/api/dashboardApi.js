import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const dashboardApi = {
  getDashboard(query) {
    return apiClient.get(endpoints.dashboard, { query });
  },
};
