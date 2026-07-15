export const mockUsers = [
  {
    id: "user-1",
    firstName: "Aliasgar",
    middleName: "Yusuf",
    lastName: "Patel",
    name: "Aliasgar Yusuf Patel",
    itsId: "12345678",
    phoneNumber: "9876543210",
    email: "aliasgar@example.com",
    gender: "MALE",
    dateOfBirth: "1996-02-12",
    role: "ADMIN",
    grade: "A",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Viramgam, Gujarat",
    hofUserId: "user-5",
    relationToHof: "SON",
    takesFmb: true
  },
  {
    id: "user-2",
    firstName: "Husain",
    middleName: "Ahmed",
    lastName: "Barot",
    name: "Husain Ahmed Barot",
    itsId: "22345678",
    phoneNumber: "9876500022",
    email: "husain@example.com",
    gender: "MALE",
    dateOfBirth: "1992-05-18",
    role: "USER",
    grade: "B",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Station Road, Viramgam",
    hofUserId: "user-2",
    relationToHof: "HOF",
    takesFmb: true
  },
  {
    id: "user-3",
    firstName: "Murtaza",
    middleName: "Mustafa",
    lastName: "Shaikh",
    name: "Murtaza Mustafa Shaikh",
    itsId: "32345678",
    phoneNumber: "9876500033",
    email: "murtaza@example.com",
    gender: "MALE",
    dateOfBirth: "1989-11-08",
    role: "COMMITTEE_MEMBER",
    grade: "C",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Moti Bazar, Viramgam",
    hofUserId: "user-3",
    relationToHof: "HOF",
    takesFmb: false
  },
  {
    id: "user-4",
    firstName: "Tahera",
    middleName: "Aliasgar",
    lastName: "Patel",
    name: "Tahera Aliasgar Patel",
    itsId: "42345678",
    phoneNumber: "9876500044",
    email: "tahera@example.com",
    gender: "FEMALE",
    dateOfBirth: "1998-09-04",
    role: "USER",
    grade: "A",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Viramgam, Gujarat",
    hofUserId: "user-5",
    relationToHof: "DAUGHTER_IN_LAW",
    takesFmb: true
  },
  {
    id: "user-5",
    firstName: "Yusuf",
    middleName: "Mohammed",
    lastName: "Patel",
    name: "Yusuf Mohammed Patel",
    itsId: "52345678",
    phoneNumber: "9876500055",
    email: "yusuf@example.com",
    gender: "MALE",
    dateOfBirth: "1965-04-22",
    role: "USER",
    grade: "A",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Viramgam, Gujarat",
    hofUserId: "user-5",
    relationToHof: "HOF",
    takesFmb: true
  },
  {
    id: "user-6",
    firstName: "Zainab",
    middleName: "Yusuf",
    lastName: "Patel",
    name: "Zainab Yusuf Patel",
    itsId: "62345678",
    phoneNumber: "9876500066",
    email: "zainab@example.com",
    gender: "FEMALE",
    dateOfBirth: "1969-07-10",
    role: "USER",
    grade: "A",
    jamaatName: "Viramgam Jamaat",
    jamiyatName: "Ahmedabad Jamiyat",
    address: "Viramgam, Gujarat",
    hofUserId: "user-5",
    relationToHof: "WIFE",
    takesFmb: true
  }
];

export const mockAnnouncements = [
  {
    id: "announcement-1",
    type: "MAJLIS",
    title: "Pehli Taarikh Mubarak",
    body: "Safarul Muzaffar pehli taarikh majlis after Maghrib.",
    date: "2026-07-15",
    location: "Viramgam Jamaatkhana",
    isActive: true
  },
  {
    id: "announcement-2",
    type: "GENERAL",
    title: "Urs Mubarak",
    body: "Urs Mubarak, 10th al-Dai al-Mutlaq Syedna Ali bin Syedi Husain RA.",
    date: "2026-07-15",
    location: "Sanaa, Yemen",
    isActive: true
  },
  {
    id: "announcement-3",
    type: "FMB",
    title: "FMB Delivery Update",
    body: "Please keep your thali ready before the delivery time.",
    date: new Date().toISOString().slice(0, 10),
    location: "",
    isActive: true
  }
];

export const mockFmbMenus = [
  {
    id: "fmb-1",
    date: new Date().toISOString().slice(0, 10),
    menu: "Dal, rice, roti, chicken curry and sweet",
    status: "SCHEDULED"
  }
];

export const mockPauses = [
  {
    id: "pause-1",
    userId: "user-2",
    fromDate: "2026-07-16",
    resumeDate: "2026-07-22",
    reason: "Family vacation",
    status: "SCHEDULED"
  }
];

export const mockPayments = [
  {
    id: "payment-1",
    userId: "user-1",
    userName: "Aliasgar Yusuf Patel",
    itsId: "12345678",
    userGrade: "A",
    paymentFor: "FMB",
    lagatType: null,
    amount: 2500,
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "UPI",
    referenceNumber: "UPI-DEMO-001",
    notes: "Monthly FMB payment",
    receiptNumber: "JMT-2026-0001",
    createdByName: "Aliasgar Yusuf Patel"
  }
];

export const prayerItems = [
  { name: "Sihori End", time: "04:49", group: "MORNING" },
  { name: "Sunrise", time: "06:04", group: "MORNING" },
  { name: "Zawal", time: "12:48", group: "AFTERNOON" },
  { name: "Zuhr End", time: "15:01", group: "AFTERNOON" },
  { name: "Asr End", time: "17:15", group: "AFTERNOON", highlighted: true },
  { name: "Maghrib", time: "19:31", group: "EVENING" },
  { name: "Nisf Ul Layl Start", time: "00:48", group: "EVENING" },
  { name: "Nisf Ul Layl End", time: "01:39", group: "EVENING" }
];
