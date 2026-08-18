export const liveEndpoints = {
  auth: {
    login: "/api/Auth/login",
    refreshToken: "/api/Auth/refresh-token",
    roles: "/api/Auth/roles",
    logout: "/api/Auth/logout"
  },



  users: {
    aamils: "/api/Users/aamils",
    aamilById: userId => `/api/Users/aamils/${userId}`,
    committeeMembers: "/api/Users/committee-members",
    committeeMemberById: userId => `/api/Users/committee-members/${userId}`,
    fmbUsers: "/api/Users/fmb-users",
    fmbUserById: userId => `/api/Users/fmb-users/${userId}`,
    madarsaAdmins: "/api/Users/madarsa-admins",
    madarsaAdminById: userId => `/api/Users/madarsa-admins/${userId}`,
    paged: (path, { pageNumber = 1, pageSize = 20, search, jamaatId } = {}) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      if (String(search || "").trim()) params.set("search", String(search).trim());
      if (jamaatId !== undefined && jamaatId !== null && jamaatId !== "") {
        params.set("jamaatId", String(jamaatId));
      }
      return `${path}?${params.toString()}`;
    }
  },

  jamiat: {
    root: "/api/Jamiat",
    byId: jamiatId => `/api/Jamiat/${jamiatId}`
  },

  jamaat: {
    root: "/api/Jamaat",
    byId: jamaatId => `/api/Jamaat/${jamaatId}`,
    byJamiat: jamiatId => `/api/Jamaat/by-jamiat/${jamiatId}`
  },

  mumineen: {
    root: "/api/Mumineen",
    byId: muminId => `/api/Mumineen/${muminId}`,
    byHof: hofId => `/api/Mumineen/hof/${encodeURIComponent(hofId)}`,
    paged: (pageNumber = 1, pageSize = 20, search = "") => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      if (String(search || "").trim()) params.set("search", String(search).trim());
      return `/api/Mumineen?${params.toString()}`;
    }
  },

  logs: {
    root: "/api/Logs",
    paged: ({
      pageNumber = 1,
      pageSize = 20,
      userId,
      isSuccess,
      method,
      search,
      fromDate,
      toDate
    } = {}) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      const optional = { userId, isSuccess, method, search, fromDate, toDate };
      Object.entries(optional).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      return `/api/Logs?${params.toString()}`;
    }
  },

  accounts: {
    paymentCategories: "/api/Accounts/payment-categories",
    paymentCategoryById: categoryId =>
      `/api/Accounts/payment-categories/${categoryId}`,
    paymentSubCategories: "/api/Accounts/payment-sub-categories",
    paymentSubCategoriesByCategory: categoryId =>
      `/api/Accounts/payment-categories/${categoryId}/sub-categories`,
    paymentSubCategoryById: subCategoryId =>
      `/api/Accounts/payment-sub-categories/${subCategoryId}`,
    paymentFields: "/api/Accounts/payment-fields",
    paymentFieldsBySubCategory: subCategoryId =>
      `/api/Accounts/payment-sub-categories/${subCategoryId}/fields`,
    paymentFieldById: fieldId => `/api/Accounts/payment-fields/${fieldId}`,
    paymentMethods: "/api/Accounts/payment-methods",
    paymentMethodById: paymentMethodId =>
      `/api/Accounts/payment-methods/${paymentMethodId}`,
    payments: "/api/Accounts/payments",
    paymentById: paymentId => `/api/Accounts/payments/${paymentId}`,
    refundPayment: paymentId => `/api/Accounts/payments/${paymentId}/refund`,
    paymentLogs: paymentId => `/api/Accounts/payments/${paymentId}/logs`,
    muminLedger: (muminId, pageNumber = 1, pageSize = 20) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      return `/api/Accounts/mumineen/${muminId}/ledger?${params.toString()}`;
    },

    daybook: "/api/Accounts/daybook",
    daybookById: dayBookId => `/api/Accounts/daybook/${dayBookId}`,
    refundDaybook: dayBookId => `/api/Accounts/daybook/${dayBookId}/refund`,
    daybookLogs: dayBookId => `/api/Accounts/daybook/${dayBookId}/logs`,
    pagedDaybook: ({
      pageNumber = 1,
      pageSize = 20,
      jamaatId,
      entryType,
      paymentMethodId,
      fromDate,
      toDate
    } = {}) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      const optional = {
        jamaatId,
        entryType,
        paymentMethodId,
        fromDate,
        toDate
      };
      Object.entries(optional).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      return `/api/Accounts/daybook?${params.toString()}`;
    },

    bankAccounts: "/api/Accounts/bank-accounts",
    bankAccountById: bankAccountId =>
      `/api/Accounts/bank-accounts/${bankAccountId}`,
    deposits: "/api/Accounts/deposits",
    depositById: bankDepositId => `/api/Accounts/deposits/${bankDepositId}`,
    depositLogs: bankDepositId =>
      `/api/Accounts/deposits/${bankDepositId}/logs`,
    pagedDeposits: ({
      pageNumber = 1,
      pageSize = 20,
      paymentMethodId,
      bankAccountId,
      fromDate,
      toDate
    } = {}) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      const optional = { paymentMethodId, bankAccountId, fromDate, toDate };
      Object.entries(optional).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      return `/api/Accounts/deposits?${params.toString()}`;
    },
    cashSummary: ({ fromDate, toDate } = {}) => {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", String(fromDate));
      if (toDate) params.set("toDate", String(toDate));
      const query = params.toString();
      return `/api/Accounts/cash-summary${query ? `?${query}` : ""}`;
    },
    summary: ({ fromDate, toDate } = {}) => {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", String(fromDate));
      if (toDate) params.set("toDate", String(toDate));
      const query = params.toString();
      return `/api/Accounts/summary${query ? `?${query}` : ""}`;
    },
    myCollectionSummary: ({ fromDate, toDate } = {}) => {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", String(fromDate));
      if (toDate) params.set("toDate", String(toDate));
      const query = params.toString();
      return `/api/Accounts/my-collection-summary${query ? `?${query}` : ""}`;
    },

    pagedPayments: ({
      pageNumber = 1,
      pageSize = 20,
      jamaatId,
      muminId,
      categoryId,
      subCategoryId,
      paymentMethodId,
      status,
      fromDate,
      toDate
    } = {}) => {
      const params = new URLSearchParams({
        pageNumber: String(pageNumber),
        pageSize: String(pageSize)
      });
      const optional = {
        jamaatId,
        muminId,
        categoryId,
        subCategoryId,
        paymentMethodId,
        status,
        fromDate,
        toDate
      };
      Object.entries(optional).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
      return `/api/Accounts/payments?${params.toString()}`;
    }
  }
};

// These endpoints remain mock-backed until matching APIs are published.
export const endpoints = {
  dashboard: "/dashboard",

  announcements: "/announcements",
  announcementById: id => `/announcements/${id}`,

  prayerTimes: "/prayer-times",
  calendar: "/calendar",
  calendarDay: "/calendar/day",

  fmbToday: "/fmb/today",
  fmbMenus: "/fmb/menus",
  fmbMenuById: id => `/fmb/menus/${id}`,
  myFmbProfile: "/fmb/members/me",
  pauseMyThali: "/fmb/members/me/pause",
  resumeMyThali: "/fmb/members/me/resume",
  fmbMembers: "/fmb/members",
  fmbMemberById: id => `/fmb/members/${id}`,
  fmbPauses: "/fmb/pauses",

  accountsSummary: "/accounts/summary",
  myPayments: "/accounts/payments/me",
  payments: "/accounts/payments",
  paymentById: id => `/accounts/payments/${id}`,
  paymentReceipt: id => `/accounts/payments/${id}/receipt`,
  paymentFamilyMembers: id => `/accounts/payments/family-members/${id}`,
  daybook: "/accounts/daybook",
  daybookEntryById: id => `/accounts/daybook/${id}`,
  ledgers: "/accounts/ledgers",
  userLedger: id => `/accounts/ledgers/${id}`,
  bankDeposits: "/accounts/bank-deposits",
  bankDepositById: id => `/accounts/bank-deposits/${id}`,

  users: "/admin/users",
  userById: id => `/admin/users/${id}`,
  updateUser: id => `/admin/users/${id}`,
  updateUserRole: id => `/admin/users/${id}/role`,
  updateUserGrade: id => `/admin/users/${id}/grade`,
  updateUserFmb: id => `/admin/users/${id}/fmb`,
  familyMembers: id => `/admin/users/${id}/family-members`,
  familyCandidates: id => `/admin/users/${id}/family-candidates`,
  addFamilyMember: id => `/admin/users/${id}/family-members`,
  updateFamilyRelation: (id, memberId) =>
    `/admin/users/${id}/family-members/${memberId}`,
  removeFamilyMember: (id, memberId) =>
    `/admin/users/${id}/family-members/${memberId}`
};

export const isPublishedApiPath = path =>
  typeof path === "string" && path.startsWith("/api/");
