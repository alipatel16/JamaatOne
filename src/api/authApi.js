import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const authApi = {
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

  createUser(payload) {
    return liveApiRequest(liveEndpoints.auth.createUser, {
      method: "POST",
      body: {
        itsNo: payload.itsNo,
        name: payload.name,
        password: payload.password,
        roleId: Number(payload.roleId)
      }
    });
  },

  createAamil(payload) {
    return liveApiRequest(liveEndpoints.auth.createAamil, {
      method: "POST",
      body: {
        itsNo: payload.itsNo,
        name: payload.name,
        password: payload.password,
        roleId: Number(payload.roleId),
        jamaatId: Number(payload.jamaatId)
      }
    });
  }
};
