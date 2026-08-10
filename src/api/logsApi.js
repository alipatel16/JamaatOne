import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const logsApi = {
  getPaged(filters = {}) {
    return liveApiRequest(liveEndpoints.logs.paged(filters));
  }
};
