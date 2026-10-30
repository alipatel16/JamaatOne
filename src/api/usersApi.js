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
      password: payload.password || "",
      categoryIds: Array.isArray(payload.categoryIds)
        ? payload.categoryIds.map(value => Number(value)).filter(Number.isFinite)
        : []
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
          : Boolean(payload.isActive),
      categoryIds: Array.isArray(payload.categoryIds)
        ? payload.categoryIds.map(value => Number(value)).filter(Number.isFinite)
        : []
    }
  });

const removeRoleUser = path => liveApiRequest(path, { method: "DELETE" });

export const usersApi = {
  getFmbUsers(filters = {}) { return paged(liveEndpoints.users.fmbUsers, filters); },
  getFmbUser(id) { return liveApiRequest(liveEndpoints.users.fmbUserById(id)); },
  createFmbUser(payload) {
    return liveApiRequest(liveEndpoints.users.fmbUsers, {
      method: "POST", body: {
        itsNo: String(payload.itsNo || "").trim(), name: String(payload.name || "").trim(), password: payload.password || "",
        ...(typeof payload.isFmbAdmin === "boolean" ? { isFmbAdmin: payload.isFmbAdmin } : {})
      }
    });
  },
  updateFmbUser(id, payload) {
    return liveApiRequest(liveEndpoints.users.fmbUserById(id), { method: "PUT", body: {
      name: String(payload.name || "").trim(),
      ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
      ...(typeof payload.isFmbAdmin === "boolean" ? { isFmbAdmin: payload.isFmbAdmin } : {})
    } });
  },
  deleteFmbUser(id) { return removeRoleUser(liveEndpoints.users.fmbUserById(id)); },
  grantRole(id, payload) {
    return liveApiRequest(liveEndpoints.users.userRoles(id), { method: "POST", body: {
      roleId: Number(payload.roleId),
      ...(Number(payload.roleId) === 3 && Array.isArray(payload.categoryIds) && payload.categoryIds.length ? { categoryIds: payload.categoryIds.map(Number) } : {})
    } });
  },
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


};
