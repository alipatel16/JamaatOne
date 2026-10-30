import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const announcementsApi = {
  getAll({ pageNumber = 1, pageSize = 20 } = {}) {
    return liveApiRequest(`${liveEndpoints.announcements.root}?${new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })}`);
  },
  get(id) { return liveApiRequest(liveEndpoints.announcements.byId(id)); },
  getLogs(id) { return liveApiRequest(liveEndpoints.announcements.logs(id)); },
  create(payload) {
    return liveApiRequest(liveEndpoints.announcements.root, { method: "POST", body: payload });
  },
  update(id, payload) {
    return liveApiRequest(liveEndpoints.announcements.byId(id), { method: "PUT", body: payload });
  },
  remove(id) {
    return liveApiRequest(liveEndpoints.announcements.byId(id), { method: "DELETE" });
  },
};
