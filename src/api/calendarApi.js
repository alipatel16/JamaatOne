import { apiClient } from "./client";
import { endpoints } from "./endpoints";

export const calendarApi = {
  getCalendar(query) {
    return apiClient.get(endpoints.calendar, { query });
  },
  getDay(query) {
    return apiClient.get(endpoints.calendarDay, { query });
  },
  getPrayerTimes(query) {
    return apiClient.get(endpoints.prayerTimes, { query });
  },
  getPrayerTimesMonth(query) {
    return apiClient.get(endpoints.prayerTimesMonth, { query });
  },
};
