import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const fmbApi = {
  getToday(query) {
    return apiClient.get(endpoints.fmbToday, { query });
  },
  getMenus(query) {
    return apiClient.get(endpoints.fmbMenus, { query });
  },
  createMenu(payload) {
    return apiClient.post(endpoints.fmbMenus, payload);
  },
  updateMenu(id, payload) {
    return apiClient.put(endpoints.fmbMenuById(id), payload);
  },
  deleteMenu(id) {
    return apiClient.delete(endpoints.fmbMenuById(id));
  },
  getMyProfile() {
    return apiClient.get(endpoints.myFmbProfile);
  },
  pauseMyThali(payload) {
    return apiClient.post(endpoints.pauseMyThali, payload);
  },
  resumeMyThali(payload = {}) {
    return apiClient.post(endpoints.resumeMyThali, payload);
  },
  getMembers(query) {
    return apiClient.get(endpoints.fmbMembers, { query });
  },
  updateMember(id, payload) {
    return apiClient.put(endpoints.fmbMemberById(id), payload);
  },
  getPauses(query) {
    return apiClient.get(endpoints.fmbPauses, { query });
  },
};
