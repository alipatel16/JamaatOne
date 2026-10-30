const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

// Run the real API builders, replacing only the authenticated network transport.
function loadModule(file, dependencies = {}) {
  const module = { exports: {} };
  const { code } = babel.transformFileSync(path.join(__dirname, "..", file), {
    configFile: false, babelrc: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"]
  });
  vm.runInNewContext(code, {
    module, exports: module.exports, URLSearchParams,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    }
  });
  return module.exports;
}

const endpoints = loadModule("src/api/endpoints.js");
const { accountsApi } = loadModule("src/api/accountsApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});
const { usersApi } = loadModule("src/api/usersApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});
const { authApi } = loadModule("src/api/authApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});
const { fmbApi } = loadModule("src/api/fmbApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});
const { announcementsApi } = loadModule("src/api/announcementsApi.js", {
  "./endpoints": endpoints,
  "./client": { liveApiRequest: (url, options) => ({ url, ...options }) }
});
const roleUtils = require("../src/utils/userRoles");
const permissions = loadModule("src/constants/roles.js", { "../utils/userRoles": roleUtils });

test("requests the selected bank and holder's paginated cheque list without guessing a status", () => {
  const request = accountsApi.getCheques({ bankAccountId: 9, mine: true, pageNumber: 2 });
  const url = new URL(request.url, "https://example.test");
  assert.equal(url.pathname, "/api/Accounts/cheques");
  assert.equal(url.searchParams.get("pageNumber"), "2");
  assert.equal(url.searchParams.get("pageSize"), "20");
  assert.equal(url.searchParams.get("bankAccountId"), "9");
  assert.equal(url.searchParams.get("mine"), "true");
  assert.equal(url.searchParams.has("status"), false);
});

test("sends selected cheque IDs and their total to the deposits POST endpoint", () => {
  const request = accountsApi.createBankDeposit({
    paymentMethodId: "3", bankAccountId: "9", amount: 7500.3,
    chequeIds: ["10", "11"], depositDate: "2026-10-15T00:00:00"
  });
  assert.equal(request.url, "/api/Accounts/deposits");
  assert.equal(request.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(request.body)), {
    paymentMethodId: 3, bankAccountId: 9, amount: 7500.3,
    chequeIds: [10, 11], depositDate: "2026-10-15T00:00:00",
    depositReferenceNo: null, remarks: null
  });
});

test("preserves the existing cash deposit and edit request bodies", () => {
  const payload = { paymentMethodId: "1", bankAccountId: "9", amount: "500" };
  for (const request of [accountsApi.createBankDeposit(payload), accountsApi.updateBankDeposit(4, payload)]) {
    assert.equal(request.body.amount, 500);
    assert.equal(request.body.paymentMethodId, 1);
    assert.equal(Object.hasOwn(request.body, "chequeIds"), false);
  }
});

test("creates and updates takhmeen using only fields permitted by each contract", () => {
  const payload = { muminId: "534", categoryId: "1", bankAccountId: "4", fromDate: "2026-10-21T12:00:00.000Z", toDate: "2027-10-20T12:00:00.000Z", niyatAmount: "40000", remarks: " Niyat " };
  const created = accountsApi.createTakhmeen(payload);
  assert.equal(created.url, "/api/Accounts/takhmeen");
  assert.equal(created.method, "POST");
  assert.equal(created.body.muminId, 534);
  assert.equal(created.body.categoryId, 1);
  assert.equal(created.body.niyatAmount, 40000);
  assert.equal(created.body.bankAccountId, 4);
  assert.equal(created.body.remarks, "Niyat");
  const updated = accountsApi.updateTakhmeen(9, payload);
  assert.equal(updated.url, "/api/Accounts/takhmeen/9");
  assert.equal(updated.method, "PUT");
  assert.equal(Object.hasOwn(updated.body, "muminId"), false);
  assert.equal(Object.hasOwn(updated.body, "categoryId"), false);
});

test("lists, fetches details with embedded history and deletes takhmeen", () => {
  const request = accountsApi.getTakhmeen({ pageNumber: 2, categoryId: 1, hasRemaining: false, search: "Test Mumin" });
  const url = new URL(request.url, "https://example.test");
  assert.equal(url.pathname, "/api/Accounts/takhmeen");
  assert.equal(url.searchParams.get("pageNumber"), "2");
  assert.equal(url.searchParams.get("categoryId"), "1");
  assert.equal(url.searchParams.get("hasRemaining"), "false");
  assert.equal(accountsApi.getTakhmeenById(9).url, "/api/Accounts/takhmeen/9");
  assert.equal(accountsApi.deleteTakhmeen(9).method, "DELETE");
});

test("includes considerTakhmeen on payment and receipt creation while preserving payment edits", () => {
  const payload = { muminId: 534, categoryId: 1, bankAccountId: 4, paymentMethodId: 1, amount: 500, considerTakhmeen: true, lines: [{ paymentMethodId: 1, amount: 500 }] };
  assert.equal(accountsApi.createPayment(payload).body.considerTakhmeen, true);
  assert.equal(accountsApi.createReceipt(payload).body.considerTakhmeen, true);
  assert.equal(accountsApi.createPayment({ ...payload, considerTakhmeen: false }).body.considerTakhmeen, false);
  assert.equal(accountsApi.createReceipt({ ...payload, considerTakhmeen: false }).body.considerTakhmeen, false);
  assert.equal(Object.hasOwn(accountsApi.updatePayment(9, payload).body, "considerTakhmeen"), false);
});

test("all permission checks consider the full role array and FMB-only users cannot access Accounts", () => {
  const user = { roles: [{ roleName: "FMB_User" }, { roleName: "Committee_Member" }] };
  assert.equal(permissions.canManageAccounts(user), true);
  assert.equal(permissions.canDeleteJamaatData(user), false);
  assert.equal(permissions.canManageUsers(user), false);
  assert.equal(permissions.canManageAccounts({ roles: [{ roleName: "FMB_Admin" }] }), false);
  assert.equal(permissions.canManageUsers({ roles: [{ roleName: "FMB_Admin" }] }), true);
  assert.equal(permissions.canDeleteJamaatData({ roles: [{ roleName: "FMB_Admin" }, { roleName: "Aamil" }] }), true);
});

test("FMB user requests use the published endpoints and omit admin changes unless explicit", () => {
  const created = usersApi.createFmbUser({ itsNo: "12345678", name: " Test ", password: "test-password", categoryIds: [2] });
  assert.equal(created.url, "/api/Users/fmb-users");
  assert.equal(created.method, "POST");
  assert.equal(Object.hasOwn(created.body, "categoryIds"), false);
  assert.equal(Object.hasOwn(created.body, "isFmbAdmin"), false);
  const updated = usersApi.updateFmbUser(4, { name: "Test", isActive: true });
  assert.equal(updated.url, "/api/Users/fmb-users/4");
  assert.equal(Object.hasOwn(updated.body, "isFmbAdmin"), false);
  assert.equal(usersApi.updateFmbUser(4, { name: "Test", isFmbAdmin: false }).body.isFmbAdmin, false);
  assert.equal(usersApi.createFmbUser({ isFmbAdmin: true }).body.isFmbAdmin, true);
  assert.equal(usersApi.deleteFmbUser(4).method, "DELETE");
});

test("changes passwords using PUT without requiring or refreshing a login session", () => {
  const request = authApi.changePassword({ itsNo: " 12345678 ", oldPassword: "old password", newPassword: "new password", confirmPassword: "new password" });
  assert.equal(request.url, "/api/Auth/change-password");
  assert.equal(request.method, "PUT");
  assert.equal(request.skipAuth, true);
  assert.equal(request.skipRefresh, true);
  assert.deepEqual(JSON.parse(JSON.stringify(request.body)), { itsNo: "12345678", oldPassword: "old password", newPassword: "new password" });
});

test("Thali API uses the live paginated list and exact single and bulk start payloads", () => {
  assert.match(fmbApi.getThaali({ pageNumber: 2, search: "Test Mumin" }).url, /^\/api\/FMB\/thaali\?pageNumber=2&pageSize=20&search=Test\+Mumin$/);
  const single = fmbApi.startThaali({ muminId: "534", startDate: "2026-10-29T12:00:00.000Z", ignored: true });
  assert.equal(single.url, "/api/FMB/thaali");
  assert.equal(single.method, "POST");
  assert.deepEqual(JSON.parse(JSON.stringify(single.body)), { muminId: 534, startDate: "2026-10-29T12:00:00.000Z" });
  const bulk = fmbApi.bulkStartThaali({ muminIds: ["534", "535"], date: "2026-10-29T12:00:00.000Z" });
  assert.equal(bulk.url, "/api/FMB/thaali/bulk");
  assert.deepEqual(JSON.parse(JSON.stringify(bulk.body)), { action: "Start", muminIds: [534, 535], date: "2026-10-29T12:00:00.000Z" });
  assert.equal(Object.hasOwn(usersApi.grantRole(40, { roleId: 5, categoryIds: [2] }).body, "categoryIds"), false);
});

test("FMB operations use live contract routes, filters and request bodies", () => {
  const stop = fmbApi.stopThaali(12, { endDate: "2026-10-30", reason: "Moving" });
  assert.equal(stop.url, "/api/FMB/thaali/12/stop"); assert.equal(stop.method, "PUT");
  assert.equal(fmbApi.updateThaali(12, {}).url, "/api/FMB/thaali/12");
  assert.equal(fmbApi.deleteThaali(12).method, "DELETE");
  assert.match(fmbApi.getSummary({ date: "2026-10-29" }).url, /^\/api\/FMB\/summary\?date=2026-10-29$/);
  assert.match(fmbApi.getPauses({ muminId: 7, pageNumber: 2 }).url, /^\/api\/FMB\/thaali\/pauses\?.*muminId=7.*pageNumber=2/);
  assert.equal(fmbApi.createPause({ fromDate: "2026-10-30" }).url, "/api/FMB/thaali/pauses");
  assert.equal(fmbApi.resumePause(9, { resumeDate: "2026-10-31" }).url, "/api/FMB/thaali/pauses/9/resume");
  assert.equal(fmbApi.getPause(9).url, "/api/FMB/thaali/pauses/9");
  assert.equal(fmbApi.getPauseLog(9).url, "/api/FMB/thaali/pauses/9/log");
  const menus = [{ menuDate: "2026-10-29T12:00:00.000Z", menuJson: {} }];
  assert.equal(fmbApi.createMenu(menus).body, menus);
  assert.equal(fmbApi.createMenu(menus).url, "/api/FMB/menu");
  assert.match(fmbApi.getMenus({ fromDate: "2026-10-29", toDate: "2026-10-29", pageNumber: 2 }).url, /fromDate=2026-10-29&toDate=2026-10-29&pageNumber=2/);
  assert.equal(fmbApi.getMenu(4).url, "/api/FMB/menu/4");
  assert.equal(fmbApi.getMenuLog(4).url, "/api/FMB/menu/4/log");
  assert.equal(fmbApi.updateMenu(4, {}).method, "PUT");
  assert.equal(fmbApi.deleteMenu(4).method, "DELETE");
});

test("FMB request window uses GET, PUT and singular log endpoint", () => {
  assert.equal(fmbApi.getRequestWindow().url, "/api/FMB/thaali/request-window");
  assert.equal(fmbApi.getRequestWindowLog().url, "/api/FMB/thaali/request-window/log");
  const body = { pauseOpenTime: "11:00", pauseCloseTime: "13:00", resumeOpenTime: "10:00", resumeCloseTime: "12:00" };
  const request = fmbApi.updateRequestWindow(body);
  assert.equal(request.url, "/api/FMB/thaali/request-window");
  assert.equal(request.method, "PUT");
  assert.deepEqual(JSON.parse(JSON.stringify(request.body)), body);
});

test("announcements use all six published live routes and paginated reads", () => {
  assert.equal(announcementsApi.getAll({ pageNumber: 2, pageSize: 20 }).url, "/api/Announcement?pageNumber=2&pageSize=20");
  const request = announcementsApi.create({ announcement: "Salaam" });
  assert.equal(request.url, "/api/Announcement"); assert.equal(request.method, "POST");
  assert.equal(request.body.announcement, "Salaam");
  assert.equal(announcementsApi.get(7).url, "/api/Announcement/7");
  assert.equal(announcementsApi.update(7, { announcement: "Updated" }).method, "PUT");
  assert.equal(announcementsApi.update(7, {}).url, "/api/Announcement/7");
  assert.equal(announcementsApi.remove(7).method, "DELETE");
  assert.equal(announcementsApi.getLogs(7).url, "/api/Announcement/7/log");
});
test("only Aamil and committee roles manage announcements; FMB-only users are readers", () => {
  for (const role of ["Committee_Member", "Aamil"]) assert.equal(permissions.canManageAnnouncements({ roles: [{ roleName: role }] }), true);
  for (const role of ["User", "Madarsa_Admin", "FMB_User", "FMB_Admin"]) assert.equal(permissions.canManageAnnouncements({ roles: [{ roleName: role }] }), false);
  assert.equal(permissions.canManageAnnouncements({ roles: [{ roleName: "Aamil" }, { roleName: "FMB_Admin" }] }), true);
});

test("personal Accounts is visible without granting management permissions", () => {
  for (const role of ["User", "FMB_User", "FMB_Admin"]) {
    const user = { roles: [{ roleName: role }] };
    assert.equal(permissions.canViewAccounts(user), true);
    assert.equal(permissions.canManageAccounts(user), false);
  }
  const request = accountsApi.getPayments({ muminId: 534, categoryId: 2, paymentMethodId: 3, status: "PAID", fromDate: "2026-10-01", toDate: "2026-10-29", pageNumber: 2 });
  const query = new URL(request.url, "https://example.test").searchParams;
  assert.equal(query.get("muminId"), "534");
  assert.equal(query.get("categoryId"), "2");
  assert.equal(query.get("paymentMethodId"), "3");
  assert.equal(query.get("status"), "PAID");
  assert.equal(query.get("pageNumber"), "2");
});

test("only FMB Admin and Aamil can change existing FMB entries or request settings", () => {
  for (const role of ["FMB_User", "User", "Committee_Member"]) assert.equal(permissions.canEditFmb({ roles: [{ roleName: role }] }), false);
  for (const role of ["FMB_Admin", "Aamil"]) assert.equal(permissions.canEditFmb({ roles: [{ roleName: role }] }), true);
  assert.equal(permissions.canEditFmb({ roles: [{ roleName: "FMB_User" }, { roleName: "FMB_Admin" }] }), true);
});

test("role assignment and cash-transfer API builders preserve contract fields", () => {
  const grant = usersApi.grantRole(4, { roleId: "3", categoryIds: ["2"] });
  assert.equal(grant.url, "/api/Users/4/roles");
  assert.equal(grant.method, "POST");
  assert.equal(grant.body.roleId, 3);
  assert.equal(grant.body.categoryIds[0], 2);
  assert.equal(Object.hasOwn(usersApi.grantRole(4, { roleId: 5 }).body, "categoryIds"), false);
  const transfer = accountsApi.createCashTransfer({ fromUserId: "4", toUserId: "9", bankAccountId: "7", cashAmount: "500", chequeIds: ["20"] });
  assert.equal(transfer.url, "/api/Accounts/cash-transfers");
  assert.equal(transfer.method, "POST");
  assert.equal(transfer.body.cashAmount, 500);
  assert.equal(transfer.body.chequeIds[0], 20);
  assert.equal(accountsApi.getUserHoldings(4).url, "/api/Accounts/cash-transfers/holdings/4");
  assert.equal(accountsApi.getCashTransfer(9).url, "/api/Accounts/cash-transfers/9");
  assert.match(accountsApi.getCashTransfers({ pageNumber: 2, fromUserId: 4 }).url, /pageNumber=2.*fromUserId=4/);
});

test("token storage and session updates preserve refreshed roles without retaining revoked privileges", async () => {
  const storage = new Map();
  const client = loadModule("src/api/client.js", {
    "expo-secure-store": {
      getItemAsync: async key => storage.get(key) || null,
      setItemAsync: async (key, value) => storage.set(key, value),
      deleteItemAsync: async key => storage.delete(key)
    },
    "react-native": { Platform: { OS: "ios" } },
    "./apiConfig": { API_CONFIG: {} }, "./endpoints": endpoints,
    "./mockStore": {}, "../utils/userRoles": roleUtils
  });
  let observed;
  client.setSessionUpdatedHandler(value => { observed = roleUtils.sessionUser(value); });
  await client.storeSession({ userId: 4, accessToken: "test-token", refreshToken: "test-refresh", roleName: "Aamil", roleId: 2 });
  assert.equal(permissions.isAamil(observed), true);
  await client.storeSession({ userId: 4, accessToken: "refreshed-test-token", refreshToken: "refreshed-test-refresh", roles: [{ roleId: 3, roleName: "Committee_Member" }] });
  assert.equal(permissions.isAamil(observed), false);
  assert.equal(permissions.isCommitteeMember(observed), true);
  assert.equal(roleUtils.sessionUser(await client.getStoredSession()).roles[0].roleName, "COMMITTEE_MEMBER");
});
