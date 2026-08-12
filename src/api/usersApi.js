import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

const paged = (path, filters = {}) =>
  liveApiRequest(liveEndpoints.users.paged(path, filters));

const createRoleUser = (path, payload) =>
  liveApiRequest(path, {
    method: "POST",
    body: {
      itsNo: String(payload.itsNo || "").trim(),
      name: String(payload.name || "").trim(),
      password: payload.password || ""
    }
  });

const updateRoleUser = (path, payload) =>
  liveApiRequest(path, {
    method: "PUT",
    body: {
      name: String(payload.name || "").trim(),
      isActive:
        payload.isActive === undefined || payload.isActive === null
          ? undefined
          : Boolean(payload.isActive)
    }
  });

const removeRoleUser = path => liveApiRequest(path, { method: "DELETE" });

export const usersApi = {
  // Super Admin -> Aamil CRUD
  getAamils(filters = {}) {
    return paged(liveEndpoints.users.aamils, filters);
  },
  getAamil(userId) {
    return liveApiRequest(liveEndpoints.users.aamilById(userId));
  },
  createAamil(payload) {
    return liveApiRequest(liveEndpoints.users.aamils, {
      method: "POST",
      body: {
        itsNo: String(payload.itsNo || "").trim(),
        name: String(payload.name || "").trim(),
        password: payload.password || "",
        jamaatId: Number(payload.jamaatId)
      }
    });
  },
  updateAamil(userId, payload) {
    const body = {
      name: String(payload.name || "").trim(),
      jamaatId: Number(payload.jamaatId),
      isActive:
        payload.isActive === undefined || payload.isActive === null
          ? undefined
          : Boolean(payload.isActive)
    };
    if (String(payload.password || "").length) body.password = payload.password;
    return liveApiRequest(liveEndpoints.users.aamilById(userId), {
      method: "PUT",
      body
    });
  },
  deleteAamil(userId) {
    return removeRoleUser(liveEndpoints.users.aamilById(userId));
  },

  // Aamil -> Committee Member CRUD
  getCommitteeMembers(filters = {}) {
    return paged(liveEndpoints.users.committeeMembers, filters);
  },
  getCommitteeMember(userId) {
    return liveApiRequest(liveEndpoints.users.committeeMemberById(userId));
  },
  createCommitteeMember(payload) {
    return createRoleUser(liveEndpoints.users.committeeMembers, payload);
  },
  updateCommitteeMember(userId, payload) {
    return updateRoleUser(liveEndpoints.users.committeeMemberById(userId), payload);
  },
  deleteCommitteeMember(userId) {
    return removeRoleUser(liveEndpoints.users.committeeMemberById(userId));
  },

  // Aamil -> FMB User CRUD
  getFmbUsers(filters = {}) {
    return paged(liveEndpoints.users.fmbUsers, filters);
  },
  getFmbUser(userId) {
    return liveApiRequest(liveEndpoints.users.fmbUserById(userId));
  },
  createFmbUser(payload) {
    return createRoleUser(liveEndpoints.users.fmbUsers, payload);
  },
  updateFmbUser(userId, payload) {
    return updateRoleUser(liveEndpoints.users.fmbUserById(userId), payload);
  },
  deleteFmbUser(userId) {
    return removeRoleUser(liveEndpoints.users.fmbUserById(userId));
  },

  // Aamil -> Madarsa Admin CRUD (endpoint spelling follows Swagger exactly).
  getMadarsaAdmins(filters = {}) {
    return paged(liveEndpoints.users.madarsaAdmins, filters);
  },
  getMadarsaAdmin(userId) {
    return liveApiRequest(liveEndpoints.users.madarsaAdminById(userId));
  },
  createMadarsaAdmin(payload) {
    return createRoleUser(liveEndpoints.users.madarsaAdmins, payload);
  },
  updateMadarsaAdmin(userId, payload) {
    return updateRoleUser(liveEndpoints.users.madarsaAdminById(userId), payload);
  },
  deleteMadarsaAdmin(userId) {
    return removeRoleUser(liveEndpoints.users.madarsaAdminById(userId));
  }
};
