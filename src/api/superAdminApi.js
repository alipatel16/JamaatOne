import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const superAdminApi = {
  getOverview() {
    return apiClient.get(endpoints.superAdminOverview);
  },

  getJamiyats(query) {
    return apiClient.get(endpoints.jamiyats, { query });
  },
  createJamiyat(payload) {
    return apiClient.post(endpoints.jamiyats, payload);
  },
  updateJamiyat(id, payload) {
    return apiClient.put(endpoints.jamiyatById(id), payload);
  },
  deleteJamiyat(id) {
    return apiClient.delete(endpoints.jamiyatById(id));
  },

  getJamaats(query) {
    return apiClient.get(endpoints.jamaats, { query });
  },
  getJamaatsByJamiyat(jamiyatId, query) {
    return apiClient.get(endpoints.jamaatsByJamiyat(jamiyatId), { query });
  },
  createJamaat(payload) {
    return apiClient.post(endpoints.jamaats, payload);
  },
  updateJamaat(id, payload) {
    return apiClient.put(endpoints.jamaatById(id), payload);
  },
  deleteJamaat(id) {
    return apiClient.delete(endpoints.jamaatById(id));
  },

  getAdmins(query) {
    return apiClient.get(endpoints.superAdmins, { query });
  },
  createAdmin(payload) {
    return apiClient.post(endpoints.superAdmins, payload);
  },
  updateAdmin(id, payload) {
    return apiClient.put(endpoints.superAdminById(id), payload);
  },
  deleteAdmin(id) {
    return apiClient.delete(endpoints.superAdminById(id));
  },
};
