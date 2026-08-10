import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const announcementsApi = {
  getAll(query) {
    return apiClient.get(endpoints.announcements, { query });
  },
  create(payload) {
    return apiClient.post(endpoints.announcements, payload);
  },
  update(id, payload) {
    return apiClient.put(endpoints.announcementById(id), payload);
  },
  remove(id) {
    return apiClient.delete(endpoints.announcementById(id));
  },
};
