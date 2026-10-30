import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const authApi = {
  changePassword(payload) {
    return liveApiRequest(liveEndpoints.auth.changePassword, {
      method: "PUT",
      skipAuth: true,
      skipRefresh: true,
      body: {
        itsNo: String(payload.itsNo || "").trim(),
        oldPassword: payload.oldPassword || "",
        newPassword: payload.newPassword || ""
      }
    });
  },
  login(itsNo, password) {
    return liveApiRequest(liveEndpoints.auth.login, {
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
      body: { itsNo, password }
    });
  },

  refreshToken(refreshToken) {
    return liveApiRequest(liveEndpoints.auth.refreshToken, {
      method: "POST",
      skipAuth: true,
      skipRefresh: true,
      body: { refreshToken }
    });
  },

  getRoles() {
    return liveApiRequest(liveEndpoints.auth.roles);
  },

  logout() {
    return liveApiRequest(liveEndpoints.auth.logout, {
      method: "POST"
    });
  },

};
