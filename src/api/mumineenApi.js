import { liveApiRequest } from "./client";
import { liveEndpoints } from "./endpoints";

export const MUMIN_UPDATE_FIELDS = [
  "itsId",
  "hofFmType",
  "hofId",
  "familyId",
  "fatherItsId",
  "motherItsId",
  "spouseItsId",
  "tanzeemFileNo",
  "fullName",
  "fullNameArabic",
  "firstPrefix",
  "prefixYear",
  "firstName",
  "fatherPrefix",
  "fatherName",
  "fatherSurname",
  "husbandPrefix",
  "husbandName",
  "surname",
  "age",
  "gender",
  "misaq",
  "maritalStatus",
  "bloodGroup",
  "warakatulTarkhis",
  "dateOfNikah",
  "dateOfNikahHijri",
  "mobile",
  "email",
  "whatsAppNo",
  "title",
  "category",
  "idara",
  "organisation",
  "organisationCsv",
  "vatan",
  "nationality",
  "jamaat",
  "jamiaat",
  "qualification",
  "languages",
  "hunars",
  "occupation",
  "subOccupation",
  "subOccupation2",
  "quranSanad",
  "qadambosiSharaf",
  "raudatTaheraZiyarat",
  "karbalaZiyarat",
  "asharaMubaraka",
  "housing",
  "typeOfHouse",
  "address",
  "building",
  "street",
  "area",
  "state",
  "city",
  "pincode",
  "sector",
  "subSector",
  "inactiveStatus",
  "dataVerificationStatus",
  "dataVerificationDate",
  "photoVerificationStatus",
  "photoVerificationDate",
  "lastScannedEvent",
  "lastScannedPlace",
  "sectorInchargeItsId",
  "sectorInchargeName",
  "sectorInchargeFemaleItsId",
  "sectorInchargeFemaleName",
  "subSectorInchargeItsId",
  "subSectorInchargeName",
  "subSectorInchargeFemaleItsId",
  "subSectorInchargeFemaleName",
  "isActive"
];

export function createMuminUpdatePayload(source = {}) {
  return MUMIN_UPDATE_FIELDS.reduce((payload, field) => {
    if (Object.prototype.hasOwnProperty.call(source, field)) {
      payload[field] = source[field];
    }
    return payload;
  }, {});
}

function uploadMumineenExcel(asset, options = {}) {
  if (!asset?.uri && !asset?.file) {
    throw new Error("Please select an Excel file to import.");
  }

  const formData = new FormData();
  const fileName = asset.name || "mumineen.xlsx";
  const mimeType =
    asset.mimeType ||
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (asset.file) {
    formData.append("file", asset.file, fileName);
  } else {
    formData.append("file", {
      uri: asset.uri,
      name: fileName,
      type: mimeType
    });
  }

  return liveApiRequest(liveEndpoints.mumineen.root, {
    method: "POST",
    body: formData,
    timeoutMs: options.timeoutMs || 180000
  });
}

export const mumineenApi = {
  getPaged(pageNumber = 1, pageSize = 20, search = "") {
    return liveApiRequest(
      liveEndpoints.mumineen.paged(pageNumber, pageSize, search)
    );
  },

  getByHof(hofId) {
    if (!hofId) return Promise.resolve([]);
    return liveApiRequest(liveEndpoints.mumineen.byHof(hofId));
  },

  getById(muminId) {
    return liveApiRequest(liveEndpoints.mumineen.byId(muminId));
  },

  // Current Swagger accepts the workbook itself as multipart/form-data.
  // Keep importExcel as an alias so older UI code does not fall back to the
  // removed JSON createMany flow.
  uploadExcel: uploadMumineenExcel,
  importExcel: uploadMumineenExcel,

  update(muminId, payload) {
    return liveApiRequest(liveEndpoints.mumineen.byId(muminId), {
      method: "PUT",
      body: createMuminUpdatePayload(payload)
    });
  },

  remove(muminId) {
    return liveApiRequest(liveEndpoints.mumineen.byId(muminId), {
      method: "DELETE"
    });
  }
};
