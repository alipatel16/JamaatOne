import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const jamiatApi = {
  getAll() {
    return liveApiRequest(liveEndpoints.jamiat.root);
  },

  getById(jamiatId) {
    return liveApiRequest(liveEndpoints.jamiat.byId(jamiatId));
  },

  createMany(items) {
    return liveApiRequest(liveEndpoints.jamiat.root, {
      method: "POST",
      body: items.map(item => ({ name: item.name }))
    });
  },

  create(name) {
    return this.createMany([{ name }]);
  },

  update(jamiatId, payload) {
    return liveApiRequest(liveEndpoints.jamiat.byId(jamiatId), {
      method: "PUT",
      body: {
        name: payload.name,
        isActive: Boolean(payload.isActive)
      }
    });
  },

  remove(jamiatId) {
    return liveApiRequest(liveEndpoints.jamiat.byId(jamiatId), {
      method: "DELETE"
    });
  }
};
