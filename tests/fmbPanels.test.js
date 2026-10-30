const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const path = require("node:path");
const babel = require("@babel/core");

// Exercise the actual panel's handlers/effects without a native renderer or network.
function panelHarness(file, api = {}, initialUser = { userId: 1, manager: true, canEdit: true }) {
  let cursor = 0, root, effects = [], user = initialUser;
  const slots = [];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), Fragment: "Fragment",
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial) { const index = cursor++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useCallback(callback, deps) { const index = cursor++; if (!slots[index] || deps.some((v, i) => !Object.is(v, slots[index].deps[i]))) slots[index] = { deps, callback }; return slots[index].callback; },
    useEffect(effect, deps) {
      const index = cursor++, previous = slots[index];
      if (!previous || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        previous?.cleanup?.();
        slots[index] = { deps }; effects.push(() => { slots[index].cleanup = effect(); });
      }
    }
  };
  const native = { Platform: { OS: "web" }, useWindowDimensions: () => ({ width: 1440 }), View: "View", Text: "Text", Pressable: "Pressable", ActivityIndicator: "ActivityIndicator", StyleSheet: { create: x => x } };
  const module = { exports: {} };
  const code = babel.transformFileSync(path.join(__dirname, "..", file), { configFile: false, babelrc: false, plugins: ["@babel/plugin-transform-react-jsx", "@babel/plugin-transform-modules-commonjs"] }).code;
  vm.runInNewContext(code, { module, exports: module.exports, Date, Set, require(name) {
    if (name === "react") return { ...React, default: React, __esModule: true };
    if (name === "react-native") return native;
    if (name.endsWith("/fmbApi")) return { fmbApi: { getMenus: async () => ({ items: [{ menuId: 1, menuDate: "2026-10-29" }] }), getThaali: async () => ({ items: [{ thaaliPeriodId: 1, fullName: "Test member" }] }), getPauses: async () => ({ items: [] }), getRequestWindow: async () => null, getRequestWindowLog: async () => [], ...api } };
    if (name.endsWith("/fmbWorkflows")) return require("../src/utils/fmbWorkflows");
    if (name.endsWith("/fmbRequestWindow")) return require("../src/utils/fmbRequestWindow");
    if (name.endsWith("/personalPayments")) return require("../src/utils/personalPayments");
    if (name.endsWith("/announcements") && name.includes("utils")) return require("../src/utils/announcements");
    if (name.endsWith("/mumineenApi")) return { mumineenApi: api };
    if (name.endsWith("/announcementsApi")) return { announcementsApi: { getAll: async () => ({ items: [{ announcementId: 1, announcement: "Community update", createdAt: "2026-10-29" }] }), ...api } };
    if (name.endsWith("/theme")) return { colors: {}, spacing: {}, radius: {} };
    if (name.endsWith("/DatePickerField")) return { __esModule: true, default: "DatePickerField", localDateValue: () => "2026-10-29", transactionDateToIso: x => x };
    if (name.endsWith("/FmbUi")) return { ui: {}, FmbSheet: "FmbSheet", Empty: "Empty", Notice: "Notice", Pager: "Pager", InlineHistory: "InlineHistory", MenuContent: "MenuContent", MENU_FIELDS: [], formatDay: x => x, formatTime: x => x };
    if (name.endsWith("/AuthContext")) return { useAuth: () => ({ user }) };
    if (name.endsWith("/roles")) return { canManageAnnouncements: v => Boolean(v.canAnnounce), canAccessFmb: () => true, isAamil: v => Boolean(v.manager && v.canEdit), isFmbUser: v => Boolean(v.manager), isFmbAdmin: v => Boolean(v.canEdit), canEditFmb: v => Boolean(v.canEdit) };
    if (name === "expo-router") return { Redirect: "Redirect", useFocusEffect: callback => React.useEffect(callback, [callback]) };
    return { __esModule: true, default: name.split("/").pop() };
  } });
  function nodes(node) { if (!node || typeof node !== "object") return []; if (Array.isArray(node)) return node.flatMap(nodes); return [node, ...nodes(node.props?.children)]; }
  return {
    render() { cursor = 0; effects = []; root = module.exports.default({ manager: user.manager, canEdit: Boolean(user.canEdit), user }); for (const effect of effects) effect(); return root; },
    node: type => nodes(root).find(node => node.type === type),
    button: title => nodes(root).find(node => node.type === "Button" && node.props.title === title),
    input: label => nodes(root).find(node => node.type === "TimePickerField" && node.props.label === label),
    tab: label => nodes(root).find(node => node.type === "Pressable" && nodes(node).some(child => child.type === "Text" && child.props.children.includes(label))),
    user(value) { user = value; }
  };
}
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

test("partial menu creation blocks resubmitting already-saved dates until the form is reopened", async () => {
  let calls = 0;
  const h = panelHarness("src/components/fmb/FmbMenusPanel.js", { createMenu: async () => { calls++; return { failedCount: 1, successCount: 1 }; } });
  h.render(); await flush(); h.render(); h.button("Add menus").props.onPress(); h.render();
  await h.node("FmbSheet").props.action.onPress(); h.render();
  assert.equal(h.node("FmbSheet").props.action.disabled, true);
  await h.node("FmbSheet").props.action.onPress();
  assert.equal(calls, 1);
});

test("FMB User can create menus and view details but cannot edit or delete them", async () => {
  const h = panelHarness("src/components/fmb/FmbMenusPanel.js", {}, { userId: 3, manager: true, canEdit: false });
  h.render(); await flush(); h.render();
  assert.ok(h.button("Add menus")); assert.ok(h.button("Details"));
  assert.equal(h.button("Edit"), undefined); assert.equal(h.button("Delete"), undefined);
});

test("FMB User can start Thali but cannot stop, edit or delete a registration", async () => {
  const h = panelHarness("src/components/ThaaliPanel.js", {}, { userId: 3, manager: true, canEdit: false });
  h.render(); await flush(); h.render();
  assert.ok(h.button("Add member")); assert.ok(h.button("Add in bulk"));
  for (const title of ["Stop", "Edit dates", "Delete"]) assert.equal(h.button(title), undefined);
});

test("request times are admin-only and losing admin access resets editing panels", () => {
  const h = panelHarness("app/(app)/fmb.js"); h.render(); assert.ok(h.tab("Request times"));
  h.tab("Menus").props.onPress(); h.render(); const key = h.node("FmbMenusPanel").props.key;
  h.user({ userId: 1, manager: true, canEdit: false }); h.render();
  assert.equal(h.tab("Request times"), undefined);
  assert.notEqual(h.node("FmbMenusPanel").props.key, key);
  assert.equal(h.node("FmbMenusPanel").props.canEdit, false);
});

test("the actual pause form rechecks a closed server window and sends no creation POST", async () => {
  let checks = 0, posts = 0;
  const h = panelHarness("src/components/fmb/FmbPausesPanel.js", {
    getRequestWindow: async () => { checks++; return { pauseOpenTime: "11:00", pauseCloseTime: "13:00", pauseOpenNow: false }; },
    createPause: async () => { posts++; }
  }, { userId: 2, manager: false, canEdit: false });
  h.render(); await flush(); h.render(); h.button("Pause my Thali").props.onPress(); h.render();
  await h.node("FmbSheet").props.action.onPress();
  assert.equal(posts, 0); assert.ok(checks >= 2);
});

test("the actual resume form checks the resume window before POST", async () => {
  let posts = 0;
  const pause = { pauseId: 8, fromDate: "2026-10-29", toDate: "2026-11-02" };
  const h = panelHarness("src/components/fmb/FmbPausesPanel.js", {
    getPauses: async () => ({ items: [pause] }), getPause: async () => pause,
    getRequestWindow: async () => ({ resumeOpenTime: "11:00", resumeCloseTime: "13:00", resumeOpenNow: false }),
    resumePause: async () => { posts++; }
  }, { userId: 2, manager: false, canEdit: false });
  h.render(); await flush(); h.render(); h.button("Resume Thali").props.onPress(); h.render(); await flush(); h.render();
  await h.node("FmbSheet").props.action.onPress(); assert.equal(posts, 0);
});

test("request-time settings never load configuration or logs for a non-admin", async () => {
  let calls = 0;
  const h = panelHarness("src/components/fmb/FmbRequestWindowPanel.js", { getRequestWindow: async () => { calls++; }, getRequestWindowLog: async () => { calls++; } }, { userId: 3, manager: true, canEdit: false });
  assert.equal(h.render(), null); await flush(); assert.equal(calls, 0);
});

test("an admin can configure request times when GET reports they have never been set", async () => {
  let submitted;
  const h = panelHarness("src/components/fmb/FmbRequestWindowPanel.js", {
    getRequestWindow: async () => { throw new Error("The FMB Admin has not set the pause / resume request times for your Jamaat yet."); },
    updateRequestWindow: async body => { submitted = body; }
  });
  h.render(); await flush(); h.render();
  assert.equal(h.button("Save request times").props.disabled, false);
  for (const [label, value] of [["Pause opens at *", "11:00"], ["Pause closes at *", "13:00"], ["Resume opens at *", "10:00"], ["Resume closes at *", "12:00"]]) {
    h.input(label).props.onChange(value); h.render();
  }
  await h.button("Save request times").props.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(submitted)), { pauseOpenTime: "11:00", pauseCloseTime: "13:00", resumeOpenTime: "10:00", resumeCloseTime: "12:00" });
});

test("closing a pending menu detail request does not disable a fresh create form", async () => {
  const h = panelHarness("src/components/fmb/FmbMenusPanel.js", { getMenu: () => new Promise(() => {}) });
  h.render(); await flush(); h.render(); h.button("Edit").props.onPress(); h.render(); h.render();
  h.node("FmbSheet").props.onClose(); h.render(); h.button("Add menus").props.onPress(); h.render();
  assert.equal(Boolean(h.node("FmbSheet").props.action.disabled), false);
});

test("role refresh remounts pause data and dialogs under the new access scope", () => {
  const h = panelHarness("app/(app)/fmb.js"); h.render(); h.tab("Pauses").props.onPress(); h.render();
  const managerKey = h.node("FmbPausesPanel").props.key;
  h.user({ userId: 1, manager: false }); h.render();
  assert.notEqual(h.node("FmbPausesPanel").props.key, managerKey);
});

test("role refresh clears menu editing access and normal users start with personal Thali", () => {
  const h = panelHarness("app/(app)/fmb.js"); h.render(); h.tab("Menus").props.onPress(); h.render();
  const managerKey = h.node("FmbMenusPanel").props.key;
  h.user({ userId: 1, manager: false }); h.render();
  assert.notEqual(h.node("FmbMenusPanel").props.key, managerKey);
  assert.equal(h.node("FmbMenusPanel").props.manager, false);
  const normal = panelHarness("app/(app)/fmb.js", {}, { userId: 2, manager: false }); normal.render();
  assert.equal(normal.node("FmbPausesPanel").props.manager, false);
  assert.equal(normal.tab("Summary"), undefined);
});

test("personal Accounts mounts only a scoped read-only payment panel", async () => {
  const h = panelHarness("src/components/PersonalAccountsPanel.js", { getPaged: async () => ({ items: [{ muminId: 534, itsId: "12345678" }] }) }, { userId: 4, itsNo: "12345678", manager: false });
  h.render(); await flush(); h.render();
  const props = h.node("PaymentPanel").props;
  assert.equal(props.manager, false); assert.equal(props.canEdit, false); assert.equal(props.canRefund, false);
  assert.equal(props.filters.muminId, 534);
  assert.equal(h.node("CashManagementPanel"), undefined);
});

test("unresolved personal identity never mounts an unscoped history panel", async () => {
  const h = panelHarness("src/components/PersonalAccountsPanel.js", { getPaged: async () => ({ items: [] }) }, { userId: 4, itsNo: "12345678", manager: false });
  h.render(); await flush(); h.render();
  assert.equal(h.node("PaymentPanel"), undefined);
  assert.ok(h.button("Retry payment history"));
});

test("announcement readers can read details and timeline without mutation actions", async () => {
  let posts = 0;
  const h = panelHarness("src/components/AnnouncementFeed.js", { create: async () => { posts++; } }, { userId: 4, canAnnounce: false });
  h.render(); await flush(); h.render();
  assert.ok(h.button("Details")); assert.ok(h.node("TimelineButton"));
  for (const label of ["Add announcement", "Edit", "Delete"]) assert.equal(h.button(label), undefined);
  await h.node("FmbSheet").props.action.onPress(); assert.equal(posts, 0);
});

test("announcement publishing sends text without obsolete title/type/expiry fields", async () => {
  let body;
  const h = panelHarness("src/components/AnnouncementFeed.js", { create: async value => { body = value; } }, { userId: 4, canAnnounce: true });
  h.render(); await flush(); h.render(); h.button("Add announcement").props.onPress(); h.render();
  h.node("Input").props.onChangeText("Salaam\nCommunity update"); h.render();
  await h.node("FmbSheet").props.action.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(body)), { announcement: "Salaam\nCommunity update" });
});
