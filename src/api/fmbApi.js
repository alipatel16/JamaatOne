import { apiClient, liveApiRequest } from "./client";
import { endpoints, liveEndpoints } from "./endpoints";

const filtered = (path, params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
};

export const fmbApi = {
  getRequestWindow() { return liveApiRequest(liveEndpoints.fmb.requestWindow); },
  updateRequestWindow(body) { return liveApiRequest(liveEndpoints.fmb.requestWindow, { method: "PUT", body }); },
  getRequestWindowLog() { return liveApiRequest(liveEndpoints.fmb.requestWindowLog); },
  getSummary(filters) { return liveApiRequest(filtered(liveEndpoints.fmb.summary, filters)); },
  stopThaali(id, body) { return liveApiRequest(liveEndpoints.fmb.stopThaali(id), { method: "PUT", body }); },
  updateThaali(id, body) { return liveApiRequest(liveEndpoints.fmb.thaaliById(id), { method: "PUT", body }); },
  deleteThaali(id) { return liveApiRequest(liveEndpoints.fmb.thaaliById(id), { method: "DELETE" }); },
  createPause(body) { return liveApiRequest(liveEndpoints.fmb.pauses, { method: "POST", body }); },
  resumePause(id, body) { return liveApiRequest(liveEndpoints.fmb.resumePause(id), { method: "POST", body }); },
  getPause(id) { return liveApiRequest(liveEndpoints.fmb.pauseById(id)); },
  getPauseLog(id) { return liveApiRequest(liveEndpoints.fmb.pauseLog(id)); },
  getMenu(id) { return liveApiRequest(liveEndpoints.fmb.menuById(id)); },
  getMenuLog(id) { return liveApiRequest(liveEndpoints.fmb.menuLog(id)); },
  getThaali({ pageNumber = 1, pageSize = 20, search = "" } = {}) {
    const query = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) });
    if (search.trim()) query.set("search", search.trim());
    return liveApiRequest(`${liveEndpoints.fmb.thaali}?${query}`);
  },
  startThaali(payload) {
    return liveApiRequest(liveEndpoints.fmb.thaali, { method: "POST", body: { muminId: Number(payload.muminId), startDate: payload.startDate } });
  },
  bulkStartThaali(payload) {
    return liveApiRequest(liveEndpoints.fmb.bulkThaali, { method: "POST", body: { action: "Start", muminIds: payload.muminIds.map(Number), date: payload.date } });
  },
  getToday(query) {
    return apiClient.get(endpoints.fmbToday, { query });
  },
  getMenus(query) {
    return liveApiRequest(filtered(liveEndpoints.fmb.menus, { ...query, pageNumber: query?.pageNumber || 1, pageSize: query?.pageSize || 20 }));
  },
  createMenu(payload) {
    return liveApiRequest(liveEndpoints.fmb.menus, { method: "POST", body: payload });
  },
  updateMenu(id, payload) {
    return liveApiRequest(liveEndpoints.fmb.menuById(id), { method: "PUT", body: payload });
  },
  deleteMenu(id) {
    return liveApiRequest(liveEndpoints.fmb.menuById(id), { method: "DELETE" });
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
    return liveApiRequest(filtered(liveEndpoints.fmb.pauses, { ...query, pageNumber: query?.pageNumber || 1, pageSize: query?.pageSize || 20 }));
  },
};
