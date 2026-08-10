import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const jamaatApi = {
  getAll() {
    return liveApiRequest(liveEndpoints.jamaat.root);
  },

  getById(jamaatId) {
    return liveApiRequest(liveEndpoints.jamaat.byId(jamaatId));
  },

  getByJamiat(jamiatId) {
    return liveApiRequest(liveEndpoints.jamaat.byJamiat(jamiatId));
  },

  createMany(items) {
    return liveApiRequest(liveEndpoints.jamaat.root, {
      method: "POST",
      body: items.map(item => ({
        name: item.name,
        jamiatId: Number(item.jamiatId)
      }))
    });
  },

  create(name, jamiatId) {
    return this.createMany([{ name, jamiatId }]);
  },

  update(jamaatId, payload) {
    return liveApiRequest(liveEndpoints.jamaat.byId(jamaatId), {
      method: "PUT",
      body: {
        name: payload.name,
        jamiatId: Number(payload.jamiatId),
        isActive: Boolean(payload.isActive)
      }
    });
  },

  remove(jamaatId) {
    return liveApiRequest(liveEndpoints.jamaat.byId(jamaatId), {
      method: "DELETE"
    });
  }
};
