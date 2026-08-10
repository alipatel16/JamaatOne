import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { accountsApi } from "../../src/api/accountsApi";
import Card from "../../src/components/Card";
import CashManagementPanel from "../../src/components/CashManagementPanel";
import CustomerLedgerPanel from "../../src/components/CustomerLedgerPanel";
import DayBookPanel from "../../src/components/DayBookPanel";
import Input from "../../src/components/Input";
import PaymentPanel from "../../src/components/PaymentPanel";
import MumineenSearchList from "../../src/components/MumineenSearchList";
import Screen from "../../src/components/Screen";
import { canManageJamaat, canRefundPayments } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";
const today = () => new Date().toISOString().slice(0, 10);

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function parseDate(value) {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DatePickerField({ label, value, onChange, allowClear = false }) {
  const [visible, setVisible] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(parseDate(value));

  useEffect(() => {
    if (visible) setVisibleMonth(parseDate(value));
  }, [visible, value]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [
    ...Array(firstWeekDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  function moveMonth(offset) {
    setVisibleMonth(new Date(year, month + offset, 1));
  }

  function selectDay(day) {
    if (!day) return;
    onChange(formatDate(new Date(year, month, day)));
    setVisible(false);
  }

  return (
    <View style={styles.dateFieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dateField} onPress={() => setVisible(true)}>
        <Text style={value ? styles.dateValue : styles.datePlaceholder}>
          {value || "Select date"}
        </Text>
        <Text style={styles.calendarIcon}>▣</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Pressable style={styles.monthButton} onPress={() => moveMonth(-1)}>
                <Text style={styles.monthButtonText}>‹</Text>
              </Pressable>
              <Text style={styles.calendarTitle}>
                {visibleMonth.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable style={styles.monthButton} onPress={() => moveMonth(1)}>
                <Text style={styles.monthButtonText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.calendarGrid}>
              {WEEK_DAYS.map((day, index) => (
                <View key={`${day}-${index}`} style={styles.calendarCell}>
                  <Text style={styles.weekDay}>{day}</Text>
                </View>
              ))}
              {calendarDays.map((day, index) => {
                const dateValue = day
                  ? formatDate(new Date(year, month, day))
                  : "";
                const selected = dateValue === value;
                const isToday = dateValue === today();
                return (
                  <View key={`${day || "blank"}-${index}`} style={styles.calendarCell}>
                    {day ? (
                      <Pressable
                        style={[
                          styles.dayButton,
                          isToday && styles.todayButton,
                          selected && styles.selectedDayButton,
                        ]}
                        onPress={() => selectDay(day)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            selected && styles.selectedDayText,
                          ]}
                        >
                          {day}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View style={styles.calendarActions}>
              {allowClear ? (
                <Pressable
                  style={styles.textAction}
                  onPress={() => {
                    onChange("");
                    setVisible(false);
                  }}
                >
                  <Text style={styles.dangerActionText}>Clear</Text>
                </Pressable>
              ) : <View />}
              <Pressable style={styles.textAction} onPress={() => setVisible(false)}>
                <Text style={styles.primaryActionText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(v || 0));

const toApiFromDate = value => value ? `${value}T00:00:00` : undefined;
const toApiToDate = value => value ? `${value}T23:59:59.999` : undefined;

export default function AccountsScreen() {
  const { user } = useAuth();
  const manager = canManageJamaat(user?.role);
  const canRefund = canRefundPayments(user?.role);
  const [tab, setTab] = useState("STATS");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [statsRange, setStatsRange] = useState("TODAY");
  const [statsFrom, setStatsFrom] = useState(today());
  const [statsTo, setStatsTo] = useState(today());
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMuminId, setPaymentMuminId] = useState("");
  const [paymentMumin, setPaymentMumin] = useState(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");

  const statsDates = useMemo(() => {
    const now = new Date();
    if (statsRange === "TODAY") return { from: today(), to: today() };
    if (statsRange === "MONTH") {
      const from = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      return { from, to };
    }
    return { from: statsFrom, to: statsTo };
  }, [statsRange, statsFrom, statsTo]);

  useEffect(() => {
    if (!manager || tab !== "STATS") return;
    let active = true;
    (async () => {
      try {
        setSummaryLoading(true);
        setError("");
        const result = await accountsApi.getAccountsSummary({
          fromDate: toApiFromDate(statsDates.from),
          toDate: toApiToDate(statsDates.to)
        });
        if (active) setSummary(result || null);
      } catch (requestError) {
        if (active) setError(requestError.message || "Unable to load account summary.");
      } finally {
        if (active) setSummaryLoading(false);
      }
    })();
    return () => { active = false; };
  }, [manager, tab, statsDates.from, statsDates.to]);

  const stats = useMemo(() => {
    const payments = summary?.paymentsOverview || {};
    const daybook = summary?.dayBookOverview || {};
    const paymentIncome = Number(payments.netAmount || 0);
    const otherIncome = Number(daybook.totalCreditAmount || 0);
    const expenses = Number(daybook.totalDebitAmount || 0);
    const received = paymentIncome + otherIncome;
    return {
      paymentIncome,
      paymentGross: Number(payments.totalPaidAmount || 0),
      paymentRefunds: Number(payments.totalRefundedAmount || 0),
      otherIncome,
      expenses,
      received,
      balance: paymentIncome + Number(daybook.netAmount || 0)
    };
  }, [summary]);

  const dailyStats = useMemo(() =>
    (Array.isArray(summary?.dailyTrend) ? summary.dailyTrend : [])
      .map(item => {
        const received = Number(item.paymentsAmount || 0) + Number(item.dayBookCreditAmount || 0);
        const expenses = Number(item.dayBookDebitAmount || 0);
        return {
          date: item.entryDate ? String(item.entryDate).slice(0, 10) : "-",
          received,
          expenses,
          balance: received - expenses
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)),
    [summary]
  );

  return (
    <Screen>
      <View style={styles.heading}>
        <View style={styles.flex}>
          <Text style={styles.title}>
            {manager ? "Accounts" : "My payments"}
          </Text>
          <Text style={styles.subtitle}>
            {manager
              ? "Payments, customer ledgers and daily debit/credit entries."
              : "Payments linked to your ITS profile."}
          </Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {manager ? (
        <View style={styles.tabs}>
          {[
            ["STATS", "Summary"],
            ["PAYMENTS", "Add Payments"],
            ["DAYBOOK", "Day book"],
            ["LEDGERS", "Customer ledgers"],
            ["MANAGEMENT", "Cash management"],
          ].map(([v, l]) => (
            <Pressable
              key={v}
              style={[styles.tab, tab === v && styles.activeTab]}
              onPress={() => {
                setTab(v);
                setSearch("");
                if (v !== "PAYMENTS") {
                  setPaymentMuminId("");
                  setPaymentMumin(null);
                }
              }}
            >
              <Text style={[styles.tabText, tab === v && styles.activeTabText]}>
                {l}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {tab === "PAYMENTS" ? (
        <MumineenSearchList
          selectedItem={paymentMumin}
          onSelect={item => {
            setPaymentMumin(item);
            setPaymentMuminId(String(item.muminId));
          }}
          onClear={() => {
            setPaymentMumin(null);
            setPaymentMuminId("");
          }}
          label="Search payments by Mumin"
          hint="Search by name, ITS ID, mobile or family ID, then select a Mumin to filter payment history."
          selectActionLabel="View payments ›"
        />
      ) : null}

      {tab === "DAYBOOK" ? (
        <Card>
          <Input
            label="Search day-book entries"
            value={search}
            onChangeText={setSearch}
            placeholder="Category, payment method or reference"
          />
        </Card>
      ) : null}

      {["PAYMENTS", "DAYBOOK"].includes(tab) ? (
        <Card>
          <Pressable
            style={styles.filterToggle}
            onPress={() => setShowFilters(value => !value)}
          >
            <View>
              <Text style={styles.filterToggleTitle}>Date filters</Text>
              <Text style={styles.filterToggleSubtitle}>
                {fromDate || toDate
                  ? `${fromDate || "Any date"} to ${toDate || "Any date"}`
                  : tab === "PAYMENTS"
                    ? "Filter payment history using the Accounts API"
                    : "Filter entries by a date range"}
              </Text>
            </View>
            <Text style={styles.filterChevron}>{showFilters ? "⌃" : "⌄"}</Text>
          </Pressable>
          {showFilters ? (
            <View style={styles.filterPanel}>
              <View style={styles.filterRow}>
                <View style={styles.filter}>
                  <DatePickerField
                    label="From date"
                    value={fromDate}
                    onChange={setFromDate}
                    allowClear
                  />
                </View>
                <View style={styles.filter}>
                  <DatePickerField
                    label="To date"
                    value={toDate}
                    onChange={setToDate}
                    allowClear
                  />
                </View>
              </View>
              {fromDate || toDate ? (
                <Pressable
                  style={styles.clearFiltersButton}
                  onPress={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  <Text style={styles.clearFiltersText}>Clear date filters</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card>
      ) : null}
      {manager && tab === "STATS" ? (
        <>
          <View style={styles.rangeTabs}>
            {[["TODAY", "Today"], ["MONTH", "This month"], ["CUSTOM", "Custom range"]].map(([value, label]) => (
              <Pressable key={value} style={[styles.rangeTab, statsRange === value && styles.activeRangeTab]} onPress={() => setStatsRange(value)}>
                <Text style={[styles.rangeTabText, statsRange === value && styles.activeRangeTabText]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {statsRange === "CUSTOM" ? (
            <Card>
              <View style={styles.filterRow}>
                <View style={styles.filter}><DatePickerField label="From date" value={statsFrom} onChange={setStatsFrom} /></View>
                <View style={styles.filter}><DatePickerField label="To date" value={statsTo} onChange={setStatsTo} /></View>
              </View>
            </Card>
          ) : null}
          <Text style={styles.periodLabel}>{statsDates.from} to {statsDates.to}</Text>
          {summaryLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <>
          <View style={styles.summary}>
            <Card style={styles.summaryCard}><Text>Money received</Text><Text style={styles.amount}>{money(stats.received)}</Text></Card>
            <Card style={styles.summaryCard}><Text>Total expenses</Text><Text style={[styles.amount, styles.debit]}>{money(stats.expenses)}</Text></Card>
            <Card style={styles.summaryCard}><Text>Balance</Text><Text style={styles.amount}>{money(stats.balance)}</Text></Card>
          </View>
          <Card>
            <Text style={styles.sectionTitle}>Account breakdown</Text>
            <View style={styles.statLine}><Text style={styles.meta}>Member payments received</Text><Text style={styles.statValue}>{money(stats.paymentGross)}</Text></View>
            <View style={styles.statLine}><Text style={styles.meta}>Payment refunds</Text><Text style={[styles.statValue, styles.debit]}>-{money(stats.paymentRefunds)}</Text></View>
            <View style={styles.statLine}><Text style={styles.meta}>Net member payments</Text><Text style={styles.statValue}>{money(stats.paymentIncome)}</Text></View>
            <View style={styles.statLine}><Text style={styles.meta}>Other credit entries</Text><Text style={styles.statValue}>{money(stats.otherIncome)}</Text></View>
            <View style={styles.statLine}><Text style={styles.meta}>Expenses recorded</Text><Text style={[styles.statValue, styles.debit]}>{money(stats.expenses)}</Text></View>
            <View style={[styles.statLine, styles.totalLine]}><Text style={styles.paymentTitle}>Available balance</Text><Text style={styles.paymentAmount}>{money(stats.balance)}</Text></View>
          </Card>
          <Text style={styles.sectionTitle}>Date-wise summary</Text>
          {dailyStats.length ? dailyStats.map((item) => (
            <Card key={item.date}>
              <Text style={styles.paymentTitle}>{item.date}</Text>
              <View style={styles.statLine}><Text style={styles.meta}>Received</Text><Text style={styles.statValue}>{money(item.received)}</Text></View>
              <View style={styles.statLine}><Text style={styles.meta}>Expenses</Text><Text style={[styles.statValue, styles.debit]}>{money(item.expenses)}</Text></View>
              <View style={[styles.statLine, styles.totalLine]}><Text style={styles.member}>Balance</Text><Text style={styles.paymentAmount}>{money(item.balance)}</Text></View>
            </Card>
          )) : <Card><Text style={styles.meta}>No account entries found for this period.</Text></Card>}
            </>
          )}
        </>
      ) : null}
      {tab === "PAYMENTS" ? (
        <PaymentPanel
          manager={manager}
          canRefund={canRefund}
          filters={{
            muminId: paymentMuminId,
            fromDate,
            toDate
          }}
        />
      ) : null}
      {manager && tab === "DAYBOOK" ? (
        <DayBookPanel
          manager={manager}
          canDelete={canRefund}
          filters={{
            search,
            fromDate,
            toDate
          }}
        />
      ) : null}
      {manager && tab === "LEDGERS" ? (
        <CustomerLedgerPanel />
      ) : null}
      {manager && tab === "MANAGEMENT" ? (
        <CashManagementPanel canDelete={canRefund} />
      ) : null}
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  flex: { flex: 1 },
  title: { fontSize: 25, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: "700" },
  activeTabText: { color: "white" },
  summary: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  summaryCard: { minWidth: 170, flex: 1, marginHorizontal: 4 },
  amount: { fontSize: 21, fontWeight: "800", color: colors.primary },
  filterToggle: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  filterToggleTitle: { color: colors.text, fontWeight: "800" },
  filterToggleSubtitle: { color: colors.muted, marginTop: 3, fontSize: 13 },
  filterChevron: { color: colors.primary, fontSize: 22, fontWeight: "800" },
  filterPanel: { paddingTop: spacing.md },
  filterRow: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  filter: { flex: 1, minWidth: 180, marginHorizontal: 4 },
  clearFiltersButton: { alignSelf: "flex-start", paddingVertical: spacing.sm },
  clearFiltersText: { color: colors.danger, fontWeight: "700" },
  dateFieldContainer: { marginBottom: spacing.md },
  fieldLabel: { color: colors.text, fontWeight: "700", marginBottom: spacing.xs },
  dateField: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateValue: { color: colors.text, fontWeight: "600" },
  datePlaceholder: { color: colors.muted },
  calendarIcon: { color: colors.primary, fontSize: 18 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  calendarModal: {
    width: "100%",
    maxWidth: 390,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  calendarTitle: { color: colors.text, fontWeight: "800", fontSize: 18 },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  monthButtonText: { color: colors.primary, fontSize: 28, lineHeight: 30 },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: { width: "14.2857%", alignItems: "center", paddingVertical: 3 },
  weekDay: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  dayButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  todayButton: { borderWidth: 1, borderColor: colors.accent },
  selectedDayButton: { backgroundColor: colors.primary },
  dayText: { color: colors.text, fontWeight: "600" },
  selectedDayText: { color: "white", fontWeight: "800" },
  calendarActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  textAction: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  primaryActionText: { color: colors.primary, fontWeight: "800" },
  dangerActionText: { color: colors.danger, fontWeight: "800" },
  formModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: "center",
  },
  formModalContainer: {
    width: "100%",
    maxWidth: 720,
    maxHeight: Platform.OS === "web" ? "90%" : "94%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: Platform.OS === "web" ? 22 : 0,
    borderBottomRightRadius: Platform.OS === "web" ? 22 : 0,
    overflow: "hidden",
  },
  formModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  formModalTitle: { color: colors.text, fontWeight: "800", fontSize: 21 },
  formModalSubtitle: { color: colors.muted, marginTop: 3 },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: { color: colors.text, fontSize: 26, lineHeight: 28 },
  formModalScroll: { flexGrow: 0 },
  formModalContent: { padding: spacing.md },
  formModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  row: { flexDirection: "row", gap: 12 },
  paymentTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
  member: { color: colors.primary, fontWeight: "700", marginTop: 4 },
  meta: { color: colors.muted, marginTop: 4 },
  paymentAmount: { fontSize: 18, fontWeight: "800", color: colors.primary },
  debit: { color: colors.danger },
  bankAccountName: { color: colors.muted, fontSize: 11, marginTop: 3 },
  recordedBy: { color: colors.info, fontSize: 11, fontWeight: "700", marginTop: 5 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.md,
  },
  ledgerLabel: { fontSize: 12, color: colors.muted, textAlign: "right" },
  rangeTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  rangeTab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  activeRangeTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  rangeTabText: { color: colors.text, fontWeight: "700" },
  activeRangeTabText: { color: "white" },
  periodLabel: { color: colors.muted, fontWeight: "700", marginBottom: spacing.md },
  statLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  statValue: { color: colors.text, fontWeight: "800" },
  totalLine: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  pending: { color: colors.danger },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  bankCard: { flex: 1, minWidth: 180, marginHorizontal: 4 },
});
