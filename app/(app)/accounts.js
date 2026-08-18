import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { accountsApi } from "../../src/api/accountsApi";
import { mumineenApi } from "../../src/api/mumineenApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import CashManagementPanel from "../../src/components/CashManagementPanel";
import CustomerLedgerPanel from "../../src/components/CustomerLedgerPanel";
import DayBookPanel from "../../src/components/DayBookPanel";
import Input from "../../src/components/Input";
import PaymentPanel from "../../src/components/PaymentPanel";
import RemoteMumineenSelect from "../../src/components/RemoteMumineenSelect";
import Screen from "../../src/components/Screen";
import { canDeleteJamaatData, canManageAccounts, canRefundPayments } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, radius, spacing } from "../../src/theme";
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
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
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
          <View style={[styles.calendarModal, phone && styles.calendarModalPhone]}>
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
                          narrow && styles.dayButtonNarrow,
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

function CollectionBreakdown({ title, items = [], nameKey }) {
  const maxAmount = Math.max(
    1,
    ...items.map(item => Number(item?.totalAmount || 0))
  );

  return (
    <View style={styles.collectionSection}>
      <Text style={styles.collectionSectionTitle}>{title}</Text>
      {items.length ? (
        items.map((item, index) => {
          const amount = Number(item?.totalAmount || 0);
          const width = amount > 0 ? `${Math.max(4, (amount / maxAmount) * 100)}%` : "0%";
          return (
            <View
              key={String(item?.categoryId ?? item?.bankAccountId ?? index)}
              style={styles.collectionRow}
            >
              <View style={styles.collectionRowTop}>
                <View style={styles.flex}>
                  <Text style={styles.collectionName}>
                    {item?.[nameKey] || "Unassigned"}
                  </Text>
                  <Text style={styles.collectionMeta}>
                    {Number(item?.paymentCount || 0)} payment{Number(item?.paymentCount || 0) === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text style={styles.collectionAmount}>{money(amount)}</Text>
              </View>
              <View style={styles.collectionTrack}>
                <View style={[styles.collectionBar, { width }]} />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.collectionEmpty}>No payment collection data for this period.</Text>
      )}
    </View>
  );
}

export default function AccountsScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const { user } = useAuth();
  const manager = canManageAccounts(user);
  const canRefund = canRefundPayments(user);
  const canDelete = canDeleteJamaatData(user);
  const [tab, setTab] = useState(manager ? "STATS" : "PAYMENTS");
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [collectionVisible, setCollectionVisible] = useState(false);
  const [collectionSummary, setCollectionSummary] = useState(null);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [collectionError, setCollectionError] = useState("");
  const [statsRange, setStatsRange] = useState("TODAY");
  const [statsFrom, setStatsFrom] = useState(today());
  const [statsTo, setStatsTo] = useState(today());
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState("");
  const [paymentMuminId, setPaymentMuminId] = useState("");
  const [paymentMumin, setPaymentMumin] = useState(null);
  const [ownMuminId, setOwnMuminId] = useState("");
  const [ownMuminLoading, setOwnMuminLoading] = useState(false);
  const [ownMuminError, setOwnMuminError] = useState("");
  const [paymentCreateRequest, setPaymentCreateRequest] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (!manager) setTab("PAYMENTS");
  }, [manager]);

  useEffect(() => {
    if (manager) {
      setOwnMuminId("");
      setOwnMuminError("");
      setOwnMuminLoading(false);
      return undefined;
    }

    let active = true;

    async function resolveOwnMuminId() {
      const directMuminId = user?.muminId;
      if (directMuminId) {
        if (active) {
          setOwnMuminId(String(directMuminId));
          setOwnMuminError("");
          setOwnMuminLoading(false);
        }
        return;
      }

      const itsNo = String(user?.itsNo || user?.itsId || "").trim();
      if (!itsNo) {
        if (active) {
          setOwnMuminId("");
          setOwnMuminError("Unable to identify your Mumineen record for payment history.");
          setOwnMuminLoading(false);
        }
        return;
      }

      try {
        setOwnMuminLoading(true);
        setOwnMuminError("");
        setOwnMuminId("");

        const result = await mumineenApi.getPaged(1, 20, itsNo);
        const items = Array.isArray(result?.items) ? result.items : [];
        const ownMumin = items.find(
          item =>
            item?.isActive !== false &&
            String(item?.itsId || "").trim() === itsNo
        );

        if (!ownMumin?.muminId) {
          throw new Error("Unable to find your Mumineen record for payment history.");
        }

        if (active) setOwnMuminId(String(ownMumin.muminId));
      } catch (requestError) {
        if (active) {
          setOwnMuminId("");
          setOwnMuminError(
            requestError.message || "Unable to identify your Mumineen record for payment history."
          );
        }
      } finally {
        if (active) setOwnMuminLoading(false);
      }
    }

    resolveOwnMuminId();
    return () => {
      active = false;
    };
  }, [manager, user?.muminId, user?.itsNo, user?.itsId]);

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

  async function openCollectionDetails() {
    setCollectionVisible(true);
    setCollectionLoading(true);
    setCollectionError("");
    try {
      const result = await accountsApi.getMyCollectionSummary({
        fromDate: toApiFromDate(statsDates.from),
        toDate: toApiToDate(statsDates.to)
      });
      setCollectionSummary(result || { byCategory: [], byBankAccount: [] });
    } catch (requestError) {
      setCollectionSummary(null);
      setCollectionError(
        requestError.message || "Unable to load collection details."
      );
    } finally {
      setCollectionLoading(false);
    }
  }

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
        <View style={[styles.tabs, phone && styles.tabsPhone]}>
          {[
            ["STATS", "Summary"],
            ["PAYMENTS", "Add Payments"],
            ["DAYBOOK", "Day book"],
            ["LEDGERS", "Customer ledgers"],
            ["MANAGEMENT", "Cash management"],
          ].map(([v, l]) => (
            <Pressable
              key={v}
              style={[styles.tab, phone && styles.tabPhone, tab === v && styles.activeTab]}
              onPress={() => {
                setTab(v);
                setSearch("");
                if (v !== "PAYMENTS") {
                  setPaymentMuminId("");
                  setPaymentMumin(null);
                  setPaymentCreateRequest(0);
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
      {manager && tab === "PAYMENTS" ? (
        <Card style={styles.paymentSearchCard}>
          <View style={[styles.paymentSearchHeader, phone && styles.paymentSearchHeaderPhone]}>
            <View style={styles.flex}>
              <Text style={styles.paymentSearchTitle}>Payments</Text>
              <Text style={styles.paymentSearchSubtitle}>Record a new payment or find an existing member payment.</Text>
            </View>
            {manager ? (
              <Pressable
                style={[styles.addPaymentButton, phone && styles.addPaymentButtonPhone]}
                onPress={() => setPaymentCreateRequest(value => value + 1)}
              >
                <Text style={styles.addPaymentPlus}>＋</Text>
                <Text style={styles.addPaymentText}>Add payment</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={styles.paymentSearchDivider} />
          <View style={[styles.memberSearchTop, narrow && styles.memberSearchTopNarrow]}>
            <View style={styles.flex}>
              <Text style={styles.memberSearchLabel}>Find member payment</Text>
              <Text style={styles.paymentSearchSubtitle}>Search by name, ITS ID, mobile or family ID.</Text>
            </View>
            {paymentMumin ? (
              <Pressable
                style={styles.clearMemberButton}
                onPress={() => {
                  setPaymentMumin(null);
                  setPaymentMuminId("");
                }}
              >
                <Text style={styles.clearMemberText}>Clear</Text>
              </Pressable>
            ) : null}
          </View>
          <RemoteMumineenSelect
            label="Mumin"
            value={paymentMuminId}
            initialItem={paymentMumin}
            placeholder="Search name, ITS ID, mobile or family ID"
            onChange={(muminId, item) => {
              setPaymentMumin(item);
              setPaymentMuminId(String(muminId || ""));
            }}
          />
        </Card>
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
                    ? "Narrow payment history by date"
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
          <View style={[styles.summaryToolbar, phone && styles.summaryToolbarPhone]}>
            <Text style={styles.periodLabel}>{statsDates.from} to {statsDates.to}</Text>
            <Pressable
              style={[styles.collectionButton, phone && styles.collectionButtonPhone]}
              onPress={openCollectionDetails}
            >
              <Text style={styles.collectionButtonText}>View More Payment Details</Text>
            </Pressable>
          </View>
          {summaryLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <>
          <View style={styles.summary}>
            <Card style={[styles.summaryCard, phone && styles.summaryCardPhone]}><Text>Money received</Text><Text style={styles.amount}>{money(stats.received)}</Text></Card>
            <Card style={[styles.summaryCard, phone && styles.summaryCardPhone]}><Text>Total expenses</Text><Text style={[styles.amount, styles.debit]}>{money(stats.expenses)}</Text></Card>
            <Card style={[styles.summaryCard, phone && styles.summaryCardPhone]}><Text>Balance</Text><Text style={styles.amount}>{money(stats.balance)}</Text></Card>
          </View>
          <Card>
            <Text style={styles.sectionTitle}>Account breakdown</Text>
            <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Member payments received</Text><Text style={styles.statValue}>{money(stats.paymentGross)}</Text></View>
            <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Payment refunds</Text><Text style={[styles.statValue, styles.debit]}>-{money(stats.paymentRefunds)}</Text></View>
            <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Net member payments</Text><Text style={styles.statValue}>{money(stats.paymentIncome)}</Text></View>
            <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Other credit entries</Text><Text style={styles.statValue}>{money(stats.otherIncome)}</Text></View>
            <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Expenses recorded</Text><Text style={[styles.statValue, styles.debit]}>{money(stats.expenses)}</Text></View>
            <View style={[styles.statLine, styles.totalLine, narrow && styles.statLineNarrow]}><Text style={styles.paymentTitle}>Available balance</Text><Text style={styles.paymentAmount}>{money(stats.balance)}</Text></View>
          </Card>
          <Text style={styles.sectionTitle}>Date-wise summary</Text>
          {dailyStats.length ? dailyStats.map((item) => (
            <Card key={item.date}>
              <Text style={styles.paymentTitle}>{item.date}</Text>
              <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Received</Text><Text style={styles.statValue}>{money(item.received)}</Text></View>
              <View style={[styles.statLine, narrow && styles.statLineNarrow]}><Text style={styles.meta}>Expenses</Text><Text style={[styles.statValue, styles.debit]}>{money(item.expenses)}</Text></View>
              <View style={[styles.statLine, styles.totalLine, narrow && styles.statLineNarrow]}><Text style={styles.member}>Balance</Text><Text style={styles.paymentAmount}>{money(item.balance)}</Text></View>
            </Card>
          )) : <Card><Text style={styles.meta}>No account entries found for this period.</Text></Card>}
            </>
          )}
        </>
      ) : null}
      {tab === "PAYMENTS" ? (
        manager || ownMuminId ? (
          <PaymentPanel
            manager={manager}
            canEdit={canDelete}
            canRefund={canDelete}
            createRequestKey={paymentCreateRequest}
            onCreateRequestHandled={() => setPaymentCreateRequest(0)}
            hideCreateButton
            filters={{
              muminId: manager ? paymentMuminId : ownMuminId,
              fromDate,
              toDate
            }}
          />
        ) : (
          <Card>
            {ownMuminLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.meta}>Loading your payment history...</Text>
              </View>
            ) : (
              <Text style={styles.error}>
                {ownMuminError || "Unable to load your payment history."}
              </Text>
            )}
          </Card>
        )
      ) : null}
      {manager && tab === "DAYBOOK" ? (
        <DayBookPanel
          manager={manager}
          canDelete={canDelete}
          canRefund={canRefund}
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
        <CashManagementPanel canDelete={canDelete} />
      ) : null}

      <Modal
        visible={collectionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCollectionVisible(false)}
      >
        <View style={[styles.collectionBackdrop, phone && styles.collectionBackdropPhone]}>
          <View style={[styles.collectionSheet, phone && styles.collectionSheetPhone]}>
            <View style={styles.collectionHeader}>
              <View style={styles.flex}>
                <Text style={styles.collectionEyebrow}>MY COLLECTION</Text>
                <Text style={styles.collectionTitle}>Payment collection details</Text>
                <Text style={styles.collectionSubtitle}>
                  {statsDates.from} to {statsDates.to}
                </Text>
              </View>
              <Pressable
                style={styles.collectionClose}
                onPress={() => setCollectionVisible(false)}
              >
                <Text style={styles.collectionCloseText}>×</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.collectionContent}
              showsVerticalScrollIndicator={false}
            >
              {collectionLoading ? (
                <View style={styles.collectionLoading}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.collectionMeta}>Loading collection analytics...</Text>
                </View>
              ) : collectionError ? (
                <Card>
                  <Text style={styles.error}>{collectionError}</Text>
                  <Button
                    title="Retry"
                    compact
                    onPress={openCollectionDetails}
                  />
                </Card>
              ) : (
                <>
                  <View style={[styles.collectionTotals, phone && styles.collectionTotalsPhone]}>
                    <Card style={styles.collectionTotalCard}>
                      <Text style={styles.collectionTotalLabel}>Collected</Text>
                      <Text style={styles.collectionTotalValue}>
                        {money(
                          (Array.isArray(collectionSummary?.byCategory)
                            ? collectionSummary.byCategory
                            : []
                          ).reduce((sum, item) => sum + Number(item.totalAmount || 0), 0)
                        )}
                      </Text>
                    </Card>
                    <Card style={styles.collectionTotalCard}>
                      <Text style={styles.collectionTotalLabel}>Payments</Text>
                      <Text style={styles.collectionTotalValue}>
                        {(Array.isArray(collectionSummary?.byCategory)
                          ? collectionSummary.byCategory
                          : []
                        ).reduce((sum, item) => sum + Number(item.paymentCount || 0), 0)}
                      </Text>
                    </Card>
                  </View>

                  <CollectionBreakdown
                    title="Collection by payment category"
                    items={Array.isArray(collectionSummary?.byCategory) ? collectionSummary.byCategory : []}
                    nameKey="categoryName"
                  />
                  <CollectionBreakdown
                    title="Collection by bank account"
                    items={Array.isArray(collectionSummary?.byBankAccount) ? collectionSummary.byBankAccount : []}
                    nameKey="bankAccountName"
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  paymentSearchCard: { backgroundColor: colors.surfaceTint, borderColor: colors.primarySoftStrong },
  paymentSearchHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.xs },
  paymentSearchHeaderPhone: { flexDirection: "column", alignItems: "stretch", gap: spacing.sm },
  paymentSearchTitle: { color: colors.text, fontSize: 17, fontWeight: "900" },
  paymentSearchSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  clearMemberButton: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.surface },
  clearMemberText: { color: colors.primaryStrong, fontWeight: "800", fontSize: 12 },
  addPaymentButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.primaryStrong, paddingHorizontal: 14, borderRadius: radius.md },
  addPaymentButtonPhone: { width: "100%", minHeight: 46 },
  addPaymentPlus: { color: "#fff", fontSize: 18, fontWeight: "900" },
  addPaymentText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  paymentSearchDivider: { height: 1, backgroundColor: colors.primarySoftStrong, marginVertical: spacing.md },
  memberSearchTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, marginBottom: spacing.xs },
  memberSearchTopNarrow: { flexWrap: "wrap" },
  memberSearchLabel: { color: colors.text, fontSize: 14, fontWeight: "900" },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  flex: { flex: 1 },
  title: { fontSize: 30, fontWeight: "900", color: colors.text },
  subtitle: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20 },
  error: { color: colors.danger, marginBottom: spacing.md },
  tabs: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
    gap: spacing.xs,
    padding: 5,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.lg,
    alignSelf: "flex-start",
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  activeTab: { backgroundColor: colors.surface, borderColor: colors.border },
  tabText: { color: colors.muted, fontWeight: "800", fontSize: 12 },
  activeTabText: { color: colors.primaryStrong },
  tabsPhone: { width: "100%", alignSelf: "stretch" },
  tabPhone: { flexGrow: 1, flexBasis: "46%", alignItems: "center", paddingHorizontal: spacing.sm },
  summary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  summaryCard: { minWidth: 190, flex: 1, marginHorizontal: 0, backgroundColor: colors.surfaceTint, borderColor: colors.primarySoftStrong },
  summaryCardPhone: { minWidth: "100%", width: "100%" },
  amount: { fontSize: 23, fontWeight: "900", color: colors.primaryStrong, marginTop: spacing.xs },
  filterToggle: {
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  filterToggleTitle: { color: colors.text, fontWeight: "900" },
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
  calendarModalPhone: { padding: spacing.sm, borderRadius: 16 },
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
  dayButtonNarrow: { width: 34, height: 34, borderRadius: 17 },
  todayButton: { borderWidth: 1, borderColor: colors.accent },
  selectedDayButton: { backgroundColor: colors.primaryStrong },
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
  loadingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  summaryToolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.md },
  summaryToolbarPhone: { flexDirection: "column", alignItems: "stretch", gap: spacing.sm },
  collectionButton: { minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.primaryStrong, alignItems: "center", justifyContent: "center" },
  collectionButtonPhone: { width: "100%" },
  collectionButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12 },
  rangeTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  rangeTab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  activeRangeTab: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  rangeTabText: { color: colors.text, fontWeight: "700" },
  activeRangeTabText: { color: "white" },
  periodLabel: { color: colors.muted, fontWeight: "700", marginBottom: spacing.md },
  statLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  statLineNarrow: { alignItems: "flex-start", flexWrap: "wrap", gap: spacing.xs },
  statValue: { color: colors.text, fontWeight: "800" },
  totalLine: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, paddingTop: spacing.md },
  pending: { color: colors.danger },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  bankCard: { flex: 1, minWidth: 180, marginHorizontal: 4 },
  collectionBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.md },
  collectionBackdropPhone: { justifyContent: "flex-end", padding: 0 },
  collectionSheet: { width: "100%", maxWidth: 860, maxHeight: "90%", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden" },
  collectionSheetPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  collectionHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  collectionEyebrow: { color: colors.accentStrong, fontSize: 9, fontWeight: "900", letterSpacing: 1.3 },
  collectionTitle: { color: colors.text, fontSize: 23, fontWeight: "900", marginTop: 4 },
  collectionSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  collectionClose: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.backgroundAlt, alignItems: "center", justifyContent: "center" },
  collectionCloseText: { color: colors.textSoft, fontSize: 25, lineHeight: 27 },
  collectionContent: { padding: spacing.lg, gap: spacing.lg },
  collectionLoading: { minHeight: 220, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  collectionTotals: { flexDirection: "row", gap: spacing.sm },
  collectionTotalsPhone: { flexDirection: "column" },
  collectionTotalCard: { flex: 1, marginHorizontal: 0, backgroundColor: colors.surfaceTint, borderColor: colors.primarySoftStrong },
  collectionTotalLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" },
  collectionTotalValue: { color: colors.primaryStrong, fontSize: 24, fontWeight: "900", marginTop: 4 },
  collectionSection: { gap: spacing.sm },
  collectionSectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  collectionRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  collectionRowTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  collectionName: { color: colors.text, fontWeight: "800", fontSize: 14 },
  collectionMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  collectionAmount: { color: colors.primaryStrong, fontWeight: "900", fontSize: 14 },
  collectionTrack: { height: 9, marginTop: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.backgroundAlt, overflow: "hidden" },
  collectionBar: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryStrong },
  collectionEmpty: { color: colors.muted, paddingVertical: spacing.lg, textAlign: "center" },
});
