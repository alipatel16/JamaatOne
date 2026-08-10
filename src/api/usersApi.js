import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const usersApi = {
  getAll(query) {
    return apiClient.get(endpoints.users, { query });
  },
  getById(id) {
    return apiClient.get(endpoints.userById(id));
  },
  update(id, payload) {
    return apiClient.put(endpoints.updateUser(id), payload);
  },
  updateRole(id, payload) {
    return apiClient.put(endpoints.updateUserRole(id), payload);
  },
  updateGrade(id, payload) {
    return apiClient.put(endpoints.updateUserGrade(id), payload);
  },
  updateFmb(id, payload) {
    return apiClient.put(endpoints.updateUserFmb(id), payload);
  },
  getFamilyMembers(id) {
    return apiClient.get(endpoints.familyMembers(id));
  },
  getFamilyCandidates(id, query) {
    return apiClient.get(endpoints.familyCandidates(id), { query });
  },
  addFamilyMember(id, payload) {
    return apiClient.post(endpoints.addFamilyMember(id), payload);
  },
  updateFamilyRelation(id, memberId, payload) {
    return apiClient.put(
      endpoints.updateFamilyRelation(id, memberId),
      payload
    );
  },
  removeFamilyMember(id, memberId) {
    return apiClient.delete(endpoints.removeFamilyMember(id, memberId));
  },
};
