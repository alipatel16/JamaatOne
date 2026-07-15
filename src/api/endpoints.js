export const endpoints = {
  login: "/auth/its-login",
  me: "/auth/me",

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
