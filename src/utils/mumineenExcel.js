import * as DocumentPicker from "expo-document-picker";
import * as XLSX from "xlsx";

const HEADER_TO_FIELD = {
  ITS_ID: "itsId",
  HOF_FM_TYPE: "hofFmType",
  HOF_ID: "hofId",
  Family_ID: "familyId",
  Father_ITS_ID: "fatherItsId",
  Mother_ITS_ID: "motherItsId",
  Spouse_ITS_ID: "spouseItsId",
  TanzeemFile_No: "tanzeemFileNo",
  Full_Name: "fullName",
  Full_Name_Arabic: "fullNameArabic",
  First_Prefix: "firstPrefix",
  Prefix_Year: "prefixYear",
  First_Name: "firstName",
  Father_Prefix: "fatherPrefix",
  Father_Name: "fatherName",
  Father_Surname: "fatherSurname",
  Husband_Prefix: "husbandPrefix",
  Husband_Name: "husbandName",
  Surname: "surname",
  Age: "age",
  Gender: "gender",
  Misaq: "misaq",
  Marital_Status: "maritalStatus",
  Blood_Group: "bloodGroup",
  Warakatul_Tarkhis: "warakatulTarkhis",
  Date_Of_Nikah: "dateOfNikah",
  Date_Of_Nikah_Hijri: "dateOfNikahHijri",
  Mobile: "mobile",
  Email: "email",
  WhatsApp_No: "whatsAppNo",
  Title: "title",
  Category: "category",
  Idara: "idara",
  Organisation: "organisation",
  Organisation_CSV: "organisationCsv",
  Vatan: "vatan",
  Nationality: "nationality",
  Jamaat: "jamaat",
  Jamiaat: "jamiaat",
  Qualification: "qualification",
  Languages: "languages",
  Hunars: "hunars",
  Occupation: "occupation",
  Sub_Occupation: "subOccupation",
  Sub_Occupation2: "subOccupation2",
  Quran_Sanad: "quranSanad",
  Qadambosi_Sharaf: "qadambosiSharaf",
  Raudat_Tahera_Ziyarat: "raudatTaheraZiyarat",
  Karbala_Ziyarat: "karbalaZiyarat",
  Ashara_Mubaraka: "asharaMubaraka",
  Housing: "housing",
  Type_of_House: "typeOfHouse",
  Address: "address",
  Building: "building",
  Street: "street",
  Area: "area",
  State: "state",
  City: "city",
  Pincode: "pincode",
  Sector: "sector",
  Sub_Sector: "subSector",
  Inactive_Status: "inactiveStatus",
  Data_Verifcation_Status: "dataVerificationStatus",
  Data_Verification_Status: "dataVerificationStatus",
  Data_Verification_Date: "dataVerificationDate",
  Photo_Verifcation_Status: "photoVerificationStatus",
  Photo_Verification_Status: "photoVerificationStatus",
  Photo_Verification_Date: "photoVerificationDate",
  Last_Scanned_Event: "lastScannedEvent",
  Last_Scanned_Place: "lastScannedPlace",
  Sector_Incharge_ITSID: "sectorInchargeItsId",
  Sector_Incharge_Name: "sectorInchargeName",
  Sector_Incharge_Female_ITSID: "sectorInchargeFemaleItsId",
  Sector_Incharge_Female_Name: "sectorInchargeFemaleName",
  Sub_Sector_Incharge_ITSID: "subSectorInchargeItsId",
  Sub_Sector_Incharge_Name: "subSectorInchargeName",
  Sub_Sector_Incharge_Female_ITSID: "subSectorInchargeFemaleItsId",
  Sub_Sector_Incharge_Female_Name: "subSectorInchargeFemaleName"
};

const INTEGER_FIELDS = new Set(["prefixYear", "age", "asharaMubaraka"]);
const REQUIRED_FIELDS = new Set(["itsId", "fullName"]);
const SUPPORTED_EXTENSIONS = ["xlsx", "xls"];

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const NORMALIZED_HEADER_TO_FIELD = Object.entries(HEADER_TO_FIELD).reduce(
  (map, [header, field]) => {
    map[normalizeHeader(header)] = field;
    return map;
  },
  {}
);

function cleanCellValue(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toInteger(value) {
  const cleaned = cleanCellValue(value);
  if (cleaned == null) return null;

  const normalized = cleaned.replace(/,/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.trunc(number) : null;
}

function isEmptyRow(row) {
  return !Array.isArray(row) || row.every(value => cleanCellValue(value) == null);
}

function getFileExtension(name = "") {
  return name.split(".").pop()?.toLowerCase() || "";
}

async function readAssetAsArrayBuffer(asset) {
  if (asset?.file && typeof asset.file.arrayBuffer === "function") {
    return asset.file.arrayBuffer();
  }

  const response = await fetch(asset.uri);
  return response.arrayBuffer();
}

function mapWorksheetRows(rows, fileName, sheetName) {
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const mappedColumns = headerRow.map(header => {
    const normalized = normalizeHeader(header);
    return {
      sourceHeader: cleanCellValue(header),
      field: NORMALIZED_HEADER_TO_FIELD[normalized] || null
    };
  });

  const mappedFields = new Set(
    mappedColumns.map(column => column.field).filter(Boolean)
  );
  const missingRequiredFields = [...REQUIRED_FIELDS].filter(
    field => !mappedFields.has(field)
  );

  if (missingRequiredFields.length > 0) {
    throw new Error(
      `The Excel file is missing required columns: ${missingRequiredFields.join(", ")}.`
    );
  }

  const unknownHeaders = mappedColumns
    .filter(column => column.sourceHeader && !column.field)
    .map(column => column.sourceHeader);
  const warnings = [];
  const errors = [];
  const records = [];
  const seenItsIds = new Map();
  let skippedBlankRows = 0;

  rows.slice(1).forEach((row, index) => {
    const excelRowNumber = index + 2;
    if (isEmptyRow(row)) {
      skippedBlankRows += 1;
      return;
    }

    const record = {};
    mappedColumns.forEach((column, columnIndex) => {
      if (!column.field) return;
      const sourceValue = row[columnIndex];
      record[column.field] = INTEGER_FIELDS.has(column.field)
        ? toInteger(sourceValue)
        : cleanCellValue(sourceValue);
    });

    if (!record.itsId) {
      errors.push(`Row ${excelRowNumber}: ITS_ID is required.`);
      return;
    }
    if (!record.fullName) {
      errors.push(`Row ${excelRowNumber}: Full_Name is required.`);
      return;
    }

    if (seenItsIds.has(record.itsId)) {
      errors.push(
        `Row ${excelRowNumber}: duplicate ITS_ID ${record.itsId} (already used on row ${seenItsIds.get(record.itsId)}).`
      );
      return;
    }
    seenItsIds.set(record.itsId, excelRowNumber);

    INTEGER_FIELDS.forEach(field => {
      const sourceColumn = mappedColumns.find(column => column.field === field);
      if (!sourceColumn) return;
      const sourceIndex = mappedColumns.indexOf(sourceColumn);
      const sourceValue = row[sourceIndex];
      if (cleanCellValue(sourceValue) != null && record[field] == null) {
        warnings.push(
          `Row ${excelRowNumber}: ${sourceColumn.sourceHeader} was not numeric and will be imported as empty.`
        );
      }
    });

    records.push(record);
  });

  if (records.length === 0 && errors.length === 0) {
    errors.push("The selected workbook does not contain any Mumineen data rows.");
  }

  if (unknownHeaders.length > 0) {
    warnings.unshift(
      `Ignored unsupported columns: ${unknownHeaders.join(", ")}.`
    );
  }

  return {
    fileName,
    sheetName,
    records,
    warnings,
    errors,
    skippedBlankRows,
    sourceRowCount: Math.max(0, rows.length - 1),
    // JSON character count is a close payload-size estimate and works on both
    // React Native and web without depending on TextEncoder support.
    payloadBytes: JSON.stringify(records).length
  };
}

export async function pickAndParseMumineenWorkbook() {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ],
    copyToCacheDirectory: true,
    multiple: false
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error("No Excel file was selected.");
  }

  const extension = getFileExtension(asset.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error("Please select an .xlsx or .xls Mumineen workbook.");
  }

  const arrayBuffer = await readAssetAsArrayBuffer(asset);
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    raw: false,
    cellDates: false,
    dateNF: "dd-mmm-yyyy"
  });

  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) {
    throw new Error("The selected Excel file does not contain a worksheet.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: null,
    blankrows: false,
    dateNF: "dd-mmm-yyyy"
  });

  return mapWorksheetRows(rows, asset.name || "Mumineen.xlsx", sheetName);
}

export function formatImportSize(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
