import {
  mockAnnouncements,
  mockFmbMenus,
  mockPauses,
  mockPayments,
  mockDaybookEntries,
  mockBankDeposits,
  mockUsers,
  prayerItems
} from "./mockData";

let currentUser = mockUsers[0];
let users = [...mockUsers];
let announcements = [...mockAnnouncements];
let fmbMenus = [...mockFmbMenus];
let pauses = [...mockPauses];
let payments = [...mockPayments];
let daybookEntries = [...mockDaybookEntries];
let bankDeposits = [...mockBankDeposits];

const wait = value =>
  new Promise(resolve => setTimeout(() => resolve(value), 120));

const parseBody = options =>
  options.body ? JSON.parse(options.body) : null;

const getUser = id => users.find(item => item.id === id);

const updateUserRecord = (id, updates) => {
  users = users.map(item =>
    item.id === id
      ? {
          ...item,
          ...updates,
          name:
            updates.name ||
            [updates.firstName || item.firstName, updates.middleName || item.middleName, updates.lastName || item.lastName]
              .filter(Boolean)
              .join(" ")
        }
      : item
  );
  if (currentUser.id === id) {
    currentUser = getUser(id);
  }
  return getUser(id);
};

const enrichPayment = payment => {
  const member = getUser(payment.userId);
  const paidFor = payment.paidForUserId
    ? getUser(payment.paidForUserId)
    : null;
  const recorder =
    getUser(payment.recordedByUserId || payment.createdById) || currentUser;

  return {
    ...payment,
    userName: member?.name || payment.userName,
    itsId: member?.itsId || payment.itsId,
    userGrade: member?.grade || payment.userGrade,
    paidForUserName: paidFor?.name || payment.paidForUserName || null,
    paidForItsId: paidFor?.itsId || payment.paidForItsId || null,
    recordedByUserId:
      payment.recordedByUserId || payment.createdById || recorder?.id,
    recordedByItsId:
      payment.recordedByItsId || payment.createdByItsId || recorder?.itsId,
    recordedByName:
      payment.recordedByName || payment.createdByName || recorder?.name
  };
};

const formatIsoDate = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const misriMonthNames = [
  "Moharram al-Haram",
  "Safarul Muzaffar",
  "Rabi al-Awwal",
  "Rabi al-Aakhar",
  "Jumada al-Ula",
  "Jumada al-Ukhra",
  "Rajab al-Asab",
  "Shaban al-Karim",
  "Ramadan al-Moazzam",
  "Shawwal al-Mukarram",
  "Zilqadatil Haram",
  "Zilhajjatil Haram"
];

const createCalendar = (year, month) => {
  const first = new Date(year, month - 1, 1);
  const totalDays = new Date(year, month, 0).getDate();
  const hijriMonthIndex = (month + 5) % 12;
  const hijriYear = year - 578;
  const days = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month - 1, day);
    const isoDate = formatIsoDate(date);
    const hijriDay = ((day + 15) % 30) + 1;
    days.push({
      gregorianDay: day,
      gregorianDate: isoDate,
      hijriDay,
      hijriDayArabic: String(hijriDay),
      isToday: isoDate === new Date().toISOString().slice(0, 10),
      hasEvent: announcements.some(item => item.date === isoDate && item.isActive)
    });
  }

  return {
    year,
    month,
    monthName: first.toLocaleString("en-US", { month: "long" }),
    firstWeekday: first.getDay(),
    hijriMonthName: misriMonthNames[hijriMonthIndex],
    hijriYear,
    days
  };
};

const getDayDetails = date => ({
  date,
  hijriDate: `1 Safarul Muzaffar 1448`,
  dayName: new Date(`${date}T12:00:00`).toLocaleString("en-US", { weekday: "long" }),
  prayerSummary: {
    sunrise: "06:04",
    zawal: "12:48",
    maghrib: "19:31"
  },
  announcements: announcements.filter(
    item => item.date === date && item.isActive
  )
});

export async function mockApiRequest(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const body = parseBody(options);

  if (path === "/auth/its-login" && method === "POST") {
    currentUser =
      users.find(item => item.itsId === body.itsId) || users[0];
    return wait({ accessToken: "mock-token", user: currentUser });
  }

  if (path === "/auth/me") {
    return wait(currentUser);
  }

  if (path === "/dashboard") {
    const today = new Date().toISOString().slice(0, 10);
    return wait({
      gregorianDate: today,
      hijriDate: "Safarul Muzaffar 1448 H",
      announcements: announcements.filter(item => item.isActive).slice(0, 5),
      fmb:
        fmbMenus.find(item => item.date === today) || {
          status: "NO_FMB",
          menu: ""
        }
    });
  }


  if (path.startsWith("/prayer-times/month")) {
    const url = new URL(`https://mock.local${path}`);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    const totalDays = new Date(year, month, 0).getDate();

    const days = Array.from({ length: totalDays }, (_, index) => {
      const day = index + 1;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const variation = day % 4;

      return {
        date,
        sihoriEnd: `04:${String(47 + variation).padStart(2, "0")}`,
        sunrise: `06:${String(2 + variation).padStart(2, "0")}`,
        zawal: `12:${String(46 + variation).padStart(2, "0")}`,
        maghrib: `19:${String(28 + variation).padStart(2, "0")}`
      };
    });

    return wait({ year, month, days });
  }

  if (path.startsWith("/prayer-times")) {
    return wait({
      date: new URL(`https://mock.local${path}`).searchParams.get("date"),
      locationName: "Viramgam",
      items: prayerItems
    });
  }

  if (path.startsWith("/calendar/day")) {
    const url = new URL(`https://mock.local${path}`);
    return wait(getDayDetails(url.searchParams.get("date")));
  }

  if (path.startsWith("/calendar")) {
    const url = new URL(`https://mock.local${path}`);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));
    return wait(createCalendar(year, month));
  }

  if (path === "/announcements" && method === "GET") {
    return wait([...announcements]);
  }

  if (path === "/announcements" && method === "POST") {
    const activeCount = announcements.filter(item => item.isActive).length;
    if (body.isActive !== false && activeCount >= 5) {
      throw new Error("Only five active dashboard announcements are allowed.");
    }
    const created = {
      id: `announcement-${Date.now()}`,
      isActive: true,
      ...body
    };
    announcements = [created, ...announcements];
    return wait(created);
  }

  if (path.startsWith("/announcements/") && method === "PUT") {
    const id = path.split("/").pop();
    const previous = announcements.find(item => item.id === id);
    const activeCount = announcements.filter(
      item => item.isActive && item.id !== id
    ).length;
    if (body.isActive && !previous?.isActive && activeCount >= 5) {
      throw new Error("Only five active dashboard announcements are allowed.");
    }
    let updated;
    announcements = announcements.map(item => {
      if (item.id !== id) return item;
      updated = { ...item, ...body, id };
      return updated;
    });
    return wait(updated);
  }

  if (path.startsWith("/announcements/") && method === "DELETE") {
    const id = path.split("/").pop();
    announcements = announcements.filter(item => item.id !== id);
    return wait({ success: true });
  }

  if (path === "/fmb/menus" && method === "GET") {
    return wait([...fmbMenus]);
  }

  if (path === "/fmb/menus" && method === "POST") {
    const created = { id: `fmb-${Date.now()}`, ...body };
    fmbMenus = [created, ...fmbMenus];
    return wait(created);
  }

  if (path.startsWith("/fmb/menus/") && method === "PUT") {
    const id = path.split("/").pop();
    const updated = { id, ...body };
    fmbMenus = fmbMenus.map(item => (item.id === id ? updated : item));
    return wait(updated);
  }

  if (path.startsWith("/fmb/menus/") && method === "DELETE") {
    const id = path.split("/").pop();
    fmbMenus = fmbMenus.filter(item => item.id !== id);
    return wait({ success: true });
  }

  if (path === "/fmb/members/me") {
    const myPause = pauses.find(
      item => item.userId === currentUser.id && item.status !== "COMPLETED"
    );
    return wait({ ...currentUser, pause: myPause || null });
  }

  if (path === "/fmb/members/me/pause" && method === "POST") {
    const pause = {
      id: `pause-${Date.now()}`,
      userId: currentUser.id,
      ...body,
      status: "ACTIVE"
    };
    pauses = [pause, ...pauses.filter(item => item.userId !== currentUser.id)];
    return wait(pause);
  }

  if (path === "/fmb/members/me/resume" && method === "POST") {
    pauses = pauses.map(item =>
      item.userId === currentUser.id
        ? { ...item, status: "COMPLETED", resumedAt: new Date().toISOString() }
        : item
    );
    return wait({ success: true });
  }

  if (path === "/fmb/members") {
    return wait(
      users.map(item => ({
        ...item,
        pause:
          pauses.find(
            pause =>
              pause.userId === item.id && pause.status !== "COMPLETED"
          ) || null
      }))
    );
  }

  if (path === "/fmb/pauses") {
    return wait(
      pauses.map(item => ({ ...item, user: getUser(item.userId) }))
    );
  }

  if (path === "/accounts/summary") {
    const paymentIncome = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const otherCredit = daybookEntries.filter(item => item.entryType === "CREDIT").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalDebit = daybookEntries.filter(item => item.entryType === "DEBIT").reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const totalReceived = paymentIncome + otherCredit;
    return wait({ totalReceived, monthReceived: totalReceived, totalDebit, balance: totalReceived - totalDebit, paymentCount: payments.length });
  }

  if (path === "/accounts/daybook" && method === "GET") {
    return wait([...daybookEntries].sort((a, b) => b.entryDate.localeCompare(a.entryDate)));
  }

  if (path === "/accounts/daybook" && method === "POST") {
    const created = { id: `entry-${Date.now()}`, ...body, createdByName: currentUser.name };
    daybookEntries = [created, ...daybookEntries];
    return wait(created);
  }

  if (path.startsWith("/accounts/daybook/") && method === "DELETE") {
    const id = path.split("/").pop();
    daybookEntries = daybookEntries.filter(item => item.id !== id);
    return wait({ success: true });
  }


  if (path === "/accounts/bank-deposits" && method === "GET") {
    return wait([...bankDeposits].sort((a, b) => b.depositDate.localeCompare(a.depositDate)));
  }

  if (path === "/accounts/bank-deposits" && method === "POST") {
    const created = {
      id: `deposit-${Date.now()}`,
      ...body,
      createdById: currentUser.id,
      createdByItsId: currentUser.itsId,
      createdByName: currentUser.name,
      recordedByUserId: body.recordedByUserId || currentUser.id,
      recordedByItsId: body.recordedByItsId || currentUser.itsId,
      recordedByName: body.recordedByName || currentUser.name
    };
    bankDeposits = [created, ...bankDeposits];
    return wait(created);
  }

  if (path.startsWith("/accounts/bank-deposits/") && method === "DELETE") {
    const id = path.split("/").pop();
    bankDeposits = bankDeposits.filter(item => item.id !== id);
    return wait({ success: true });
  }

  if (path === "/accounts/ledgers") {
    return wait(users.map(member => {
      const memberPayments = payments.filter(item => item.userId === member.id);
      return { userId: member.id, userName: member.name, itsId: member.itsId, phoneNumber: member.phoneNumber, grade: member.grade, paymentCount: memberPayments.length, totalPaid: memberPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0), lastPaymentDate: memberPayments.sort((a,b) => b.paymentDate.localeCompare(a.paymentDate))[0]?.paymentDate || null };
    }).sort((a,b) => b.totalPaid - a.totalPaid));
  }

  if (path.startsWith("/accounts/ledgers/")) {
    const userId = path.split("/").pop();
    const member = getUser(userId);
    const entries = payments.filter(item => item.userId === userId).map(enrichPayment).sort((a,b) => b.paymentDate.localeCompare(a.paymentDate));
    return wait({ user: member, entries, totalPaid: entries.reduce((sum,item) => sum + Number(item.amount || 0), 0), paymentCount: entries.length });
  }

  if (path === "/accounts/payments/me") {
    return wait(
      payments
        .filter(item => item.userId === currentUser.id)
        .map(enrichPayment)
    );
  }

  if (path === "/accounts/payments" && method === "GET") {
    return wait(payments.map(enrichPayment));
  }

  if (path === "/accounts/payments" && method === "POST") {
    const created = enrichPayment({
      id: `payment-${Date.now()}`,
      ...body,
      receiptNumber: `JMT-2026-${String(payments.length + 1).padStart(4, "0")}`,
      createdById: currentUser.id,
      createdByItsId: currentUser.itsId,
      createdByName: currentUser.name,
      recordedByUserId: body.recordedByUserId || currentUser.id,
      recordedByItsId: body.recordedByItsId || currentUser.itsId,
      recordedByName: body.recordedByName || currentUser.name
    });
    payments = [created, ...payments];
    return wait(created);
  }

  if (path.endsWith("/receipt")) {
    const id = path.split("/")[3];
    const payment = payments.find(item => item.id === id);
    return wait({
      ...enrichPayment(payment),
      jamaatName: "Viramgam Jamaat",
      jamaatAddress: "Viramgam, Gujarat",
      amountInWords: `${Number(payment?.amount || 0)} rupees only`,
      paidForUserName: payment?.paidForUserId
        ? getUser(payment.paidForUserId)?.name
        : null,
      paidForItsId: payment?.paidForUserId
        ? getUser(payment.paidForUserId)?.itsId
        : null,
      recordedByUserId: payment?.recordedByUserId || payment?.createdById,
      recordedByItsId: payment?.recordedByItsId || payment?.createdByItsId,
      recordedByName: payment?.recordedByName || payment?.createdByName
    });
  }

  if (path.startsWith("/accounts/payments/") && method === "PUT") {
    const id = path.split("/").pop();
    let updated;
    payments = payments.map(item => {
      if (item.id !== id) return item;
      updated = enrichPayment({ ...item, ...body, id });
      return updated;
    });
    return wait(updated);
  }

  if (path.startsWith("/accounts/payments/") && method === "DELETE") {
    if (currentUser.role !== "ADMIN") {
      throw new Error("Only an admin can delete payment entries.");
    }
    const id = path.split("/").pop();
    payments = payments.filter(item => item.id !== id);
    return wait({ success: true });
  }

  if (path === "/admin/users" && method === "GET") {
    return wait([...users]);
  }

  if (
    path.startsWith("/admin/users/") &&
    path.endsWith("/family-candidates")
  ) {
    const id = path.split("/")[3];
    const selected = getUser(id);
    return wait(
      users.filter(
        item =>
          item.id !== id &&
          item.hofUserId !== selected.hofUserId
      )
    );
  }

  if (
    path.startsWith("/admin/users/") &&
    path.endsWith("/family-members") &&
    method === "GET"
  ) {
    const id = path.split("/")[3];
    const selected = getUser(id);
    const hofId = selected.hofUserId || selected.id;
    return wait(users.filter(item => item.hofUserId === hofId));
  }

  if (
    path.startsWith("/admin/users/") &&
    path.endsWith("/family-members") &&
    method === "POST"
  ) {
    const id = path.split("/")[3];
    const selected = getUser(id);
    const hofId =
      selected.relationToHof === "HOF"
        ? selected.id
        : selected.hofUserId || selected.id;
    return wait(
      updateUserRecord(body.memberUserId, {
        hofUserId: hofId,
        relationToHof: body.relationToHof
      })
    );
  }

  if (
    path.includes("/family-members/") &&
    method === "PATCH"
  ) {
    const parts = path.split("/");
    const memberId = parts[5];
    return wait(
      updateUserRecord(memberId, {
        relationToHof: body.relationToHof
      })
    );
  }

  if (
    path.includes("/family-members/") &&
    method === "DELETE"
  ) {
    const parts = path.split("/");
    const memberId = parts[5];
    return wait(
      updateUserRecord(memberId, {
        hofUserId: memberId,
        relationToHof: "HOF"
      })
    );
  }

  if (path.startsWith("/admin/users/") && method === "GET") {
    const id = path.split("/")[3];
    return wait(getUser(id));
  }

  if (path.startsWith("/admin/users/") && method === "PUT") {
    const id = path.split("/")[3];
    return wait(updateUserRecord(id, body));
  }

  if (path.endsWith("/role") && method === "PATCH") {
    const id = path.split("/")[3];
    return wait(updateUserRecord(id, { role: body.role }));
  }

  if (path.endsWith("/grade") && method === "PATCH") {
    const id = path.split("/")[3];
    return wait(updateUserRecord(id, { grade: body.grade }));
  }

  if (path.endsWith("/fmb") && method === "PATCH") {
    const id = path.split("/")[3];
    return wait(updateUserRecord(id, { takesFmb: body.takesFmb }));
  }

  throw new Error(`Mock endpoint not implemented: ${method} ${path}`);
}
