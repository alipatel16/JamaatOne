import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { colors, radius, shadows, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";

const money = value =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

const number = value => Number(value || 0);

function CollapsibleSection({
  title,
  subtitle,
  icon,
  children,
  defaultExpanded = false,
  phone = false
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [contentHeight, setContentHeight] = useState(0);
  const progress = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  function toggle() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    Animated.timing(progress, {
      toValue: nextExpanded ? 1 : 0,
      duration: 240,
      useNativeDriver: false
    }).start();
  }

  const chevronRotation = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"]
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 0]
  });
  const animatedHeight = contentHeight
    ? progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, contentHeight]
      })
    : 0;

  return (
    <View style={[styles.accordion, expanded && styles.accordionExpanded]}>
      <Pressable
        style={[styles.accordionHeader, phone && styles.accordionHeaderPhone]}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.accordionIcon}>
          <MaterialCommunityIcons name={icon} size={21} color={colors.primaryStrong} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.accordionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.accordionSubtitle}>{subtitle}</Text> : null}
        </View>
        <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
          <MaterialCommunityIcons name="chevron-down" size={24} color={colors.textSoft} />
        </Animated.View>
      </Pressable>

      <Animated.View
        pointerEvents={expanded ? "auto" : "none"}
        accessibilityElementsHidden={!expanded}
        importantForAccessibility={expanded ? "auto" : "no-hide-descendants"}
        style={[
          styles.accordionAnimatedBody,
          {
            height: animatedHeight,
            opacity: progress,
            transform: [{ translateY }]
          }
        ]}
      >
        <View
          style={styles.accordionContent}
          onLayout={event => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            if (nextHeight > 0 && nextHeight !== contentHeight) {
              setContentHeight(nextHeight);
            }
          }}
        >
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

function OverviewTile({ icon, label, value, tone = "primary", phone }) {
  const toneStyle =
    tone === "danger"
      ? styles.overviewDanger
      : tone === "warning"
        ? styles.overviewWarning
        : tone === "success"
          ? styles.overviewSuccess
          : styles.overviewPrimary;

  return (
    <View style={[styles.overviewTile, phone && styles.overviewTilePhone, toneStyle]}>
      <View style={styles.overviewIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={tone === "danger" ? colors.danger : tone === "warning" ? colors.warning : tone === "success" ? colors.success : colors.primaryStrong}
        />
      </View>
      <Text style={styles.overviewLabel}>{label}</Text>
      <Text style={styles.overviewValue} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)}
      </Text>
    </View>
  );
}

function BreakdownSection({ title, subtitle, items, nameForItem, amountForItem, metaForItem, emptyText, showHeading = true }) {
  const max = Math.max(1, ...items.map(item => number(amountForItem(item))));
  return (
    <Card style={styles.sectionCard} elevated={false}>
      {showHeading ? (
        <View style={styles.sectionHeading}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
        </View>
      ) : null}
      {items.length ? (
        items.map((item, index) => {
          const amount = number(amountForItem(item));
          const barWidth = `${Math.max(amount > 0 ? 5 : 0, (amount / max) * 100)}%`;
          return (
            <View key={String(item?.subCategoryId ?? item?.categoryId ?? index)} style={styles.breakdownRow}>
              <View style={styles.breakdownTop}>
                <View style={styles.flex}>
                  <Text style={styles.breakdownName}>{nameForItem(item)}</Text>
                  <Text style={styles.breakdownMeta}>{metaForItem(item)}</Text>
                </View>
                <Text style={styles.breakdownAmount}>{money(amount)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: barWidth }]} />
              </View>
            </View>
          );
        })
      ) : (
        <Text style={styles.empty}>{emptyText}</Text>
      )}
    </Card>
  );
}

function BalanceMetric({ label, value, danger = false }) {
  return (
    <View style={styles.balanceMetric}>
      <Text style={styles.balanceMetricLabel}>{label}</Text>
      <Text style={[styles.balanceMetricValue, danger && number(value) > 0 && styles.dangerText]}>
        {money(value)}
      </Text>
    </View>
  );
}

function BankAccountSection({ items, phone, showHeading = true }) {
  return (
    <View>
      {showHeading ? (
        <View style={styles.blockHeader}>
          <View style={styles.blockIcon}>
            <MaterialCommunityIcons name="bank-outline" size={21} color={colors.primaryStrong} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.blockTitle}>Bank account balances</Text>
            <Text style={styles.blockSubtitle}>Opening, live and pending balances for every collection account.</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.bankGrid}>
        {items.length ? items.map(item => (
          <Card key={String(item.bankAccountId)} style={[styles.bankCard, phone && styles.bankCardPhone]}>
            <View style={styles.bankHeader}>
              <View style={styles.bankBadge}>
                <MaterialCommunityIcons name="bank" size={19} color={colors.primaryStrong} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.bankName}>{item.bankAccountName || "Bank account"}</Text>
                <Text style={styles.bankCaption}>Current balance</Text>
              </View>
            </View>
            <Text style={styles.currentBalance}>{money(item.currentBalance)}</Text>
            <View style={styles.balanceGrid}>
              <BalanceMetric label="Opening" value={item.openingBalance} />
              <BalanceMetric label="Pending cash" value={item.pendingCashBalance} danger />
              <BalanceMetric label="Pending cheque" value={item.pendingChequeBalance} danger />
            </View>
          </Card>
        )) : (
          <Card style={styles.fullWidthCard} elevated={false}>
            <Text style={styles.empty}>No bank-account balance data is available.</Text>
          </Card>
        )}
      </View>
    </View>
  );
}

function BankMethodSection({ items, showHeading = true }) {
  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = String(item.bankAccountId ?? "unassigned");
      if (!map.has(key)) {
        map.set(key, {
          bankAccountId: item.bankAccountId,
          bankAccountName: item.bankAccountName || "Unassigned bank account",
          items: []
        });
      }
      map.get(key).items.push(item);
    });
    return Array.from(map.values());
  }, [items]);

  return (
    <Card style={styles.sectionCard} elevated={false}>
      {showHeading ? (<>
        <Text style={styles.sectionTitle}>Collection by bank account & method</Text>
        <Text style={styles.sectionSubtitle}>See exactly how each payment method is flowing into each bank account.</Text>
      </>) : null}
      {grouped.length ? grouped.map(group => (
        <View key={String(group.bankAccountId ?? group.bankAccountName)} style={styles.methodGroup}>
          <View style={styles.methodGroupHeader}>
            <MaterialCommunityIcons name="bank-transfer-in" size={20} color={colors.primaryStrong} />
            <Text style={styles.methodBankName}>{group.bankAccountName}</Text>
          </View>
          {group.items.map((item, index) => {
            const pending = Math.max(0, number(item.totalCollected) - number(item.totalDeposited));
            return (
              <View key={`${item.paymentMethodId}-${index}`} style={styles.methodRow}>
                <View style={styles.flex}>
                  <Text style={styles.methodName}>{item.paymentMethodName || "Payment method"}</Text>
                  <Text style={styles.methodMeta}>
                    Collected {money(item.totalCollected)} · Deposited {money(item.totalDeposited)}
                  </Text>
                </View>
                <View style={[styles.pendingPill, pending <= 0 && styles.settledPill]}>
                  <Text style={[styles.pendingPillText, pending <= 0 && styles.settledPillText]}>
                    {pending <= 0 ? "Settled" : `${money(pending)} pending`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )) : <Text style={styles.empty}>No bank-account payment-method data is available.</Text>}
    </Card>
  );
}

function UserCollections({ data, onPageChange, loading, phone, showHeading = true }) {
  const items = Array.isArray(data?.items) ? data.items : [];
  const pageNumber = Math.max(1, number(data?.pageNumber) || 1);
  const totalPages = Math.max(1, number(data?.totalPages) || 1);
  const totalCount = number(data?.totalCount);

  return (
    <Card style={styles.sectionCard} elevated={false}>
      {showHeading ? (
        <View style={[styles.sectionHeading, phone && styles.sectionHeadingPhone]}>
          <View style={styles.flex}>
            <Text style={styles.sectionTitle}>Collection by user</Text>
            <Text style={styles.sectionSubtitle}>{totalCount} collector record{totalCount === 1 ? "" : "s"}</Text>
          </View>
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      ) : loading ? <ActivityIndicator color={colors.primary} style={styles.inlineLoader} /> : null}
      {items.length ? items.map(item => (
        <View key={String(item.userId)} style={styles.userRow}>
          <View style={styles.userAvatar}>
            <MaterialCommunityIcons name="account-outline" size={20} color={colors.primaryStrong} />
          </View>
          <View style={styles.flex}>
            <View style={styles.userTitleRow}>
              <Text style={styles.userName}>{item.userName || `User ${item.userId}`}</Text>
              <Text style={styles.userTotal}>{money(item.totalAmount)}</Text>
            </View>
            <Text style={styles.userMeta}>
              {[item.roleName, item.itsNo ? `ITS ${item.itsNo}` : null, `${number(item.paymentCount)} payments`]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={styles.userMethodChips}>
              <View style={styles.userChip}><Text style={styles.userChipText}>Cash {money(item.cashAmount)}</Text></View>
              <View style={styles.userChip}><Text style={styles.userChipText}>Cheque {money(item.chequeAmount)}</Text></View>
              <View style={styles.userChip}><Text style={styles.userChipText}>Other {money(item.otherAmount)}</Text></View>
            </View>
          </View>
        </View>
      )) : <Text style={styles.empty}>No collector-wise payment data is available.</Text>}

      {totalPages > 1 ? (
        <View style={[styles.pagination, phone && styles.paginationPhone]}>
          <Button
            title="Previous"
            compact
            variant="outline"
            disabled={pageNumber <= 1 || loading}
            onPress={() => onPageChange?.(pageNumber - 1)}
          />
          <Text style={styles.pageText}>Page {pageNumber} of {totalPages}</Text>
          <Button
            title="Next"
            compact
            variant="outline"
            disabled={pageNumber >= totalPages || loading}
            onPress={() => onPageChange?.(pageNumber + 1)}
          />
        </View>
      ) : null}
    </Card>
  );
}

function PendingByUser({ items, phone, showHeading = true }) {
  const grouped = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = String(item.bankAccountId ?? "unassigned");
      if (!map.has(key)) {
        map.set(key, {
          bankAccountName: item.bankAccountName || "Unassigned bank account",
          items: [],
          total: 0
        });
      }
      const group = map.get(key);
      group.items.push(item);
      group.total += number(item.estimatedPendingAmount);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [items]);

  return (
    <Card style={[styles.pendingCard, shadows.card]}>
      {showHeading ? (
        <View style={styles.pendingHeader}>
          <View style={styles.pendingHeaderIcon}>
            <MaterialCommunityIcons name="cash-clock" size={22} color={colors.warning} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.pendingTitle}>Pending collection ownership</Text>
            <Text style={styles.pendingSubtitle}>Who currently holds pending cash/cheque and which bank account it belongs to.</Text>
          </View>
        </View>
      ) : null}
      {grouped.length ? grouped.map(group => (
        <View key={group.bankAccountName} style={styles.pendingGroup}>
          <View style={[styles.pendingGroupHeader, phone && styles.pendingGroupHeaderPhone]}>
            <View style={styles.flex}>
              <Text style={styles.pendingBank}>{group.bankAccountName}</Text>
              <Text style={styles.pendingBankMeta}>{group.items.length} pending allocation{group.items.length === 1 ? "" : "s"}</Text>
            </View>
            <Text style={styles.pendingBankTotal}>{money(group.total)}</Text>
          </View>
          {group.items.map((item, index) => (
            <View key={`${item.userId}-${item.balanceType}-${index}`} style={styles.pendingUserRow}>
              <View style={styles.flex}>
                <Text style={styles.pendingUser}>{item.userName || `User ${item.userId}`}</Text>
                <Text style={styles.pendingType}>{item.balanceType || "Pending"}</Text>
              </View>
              <Text style={styles.pendingAmount}>{money(item.estimatedPendingAmount)}</Text>
            </View>
          ))}
        </View>
      )) : <Text style={styles.empty}>No pending user allocations are currently reported.</Text>}
    </Card>
  );
}

export default function CollectionSummaryDashboard({
  data,
  loading = false,
  error = "",
  onRetry,
  onUserPageChange,
  userPageLoading = false,
  title = "Collection intelligence",
  subtitle = "A complete view of collections, deposits, bank balances and pending ownership.",
  showHeader = true,
  collapsibleSections = false,
  defaultCollapsed = false
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;

  if (loading && !data) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingText}>Loading collection intelligence...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <Text style={styles.error}>{error}</Text>
        {onRetry ? <Button title="Retry" compact onPress={onRetry} /> : null}
      </Card>
    );
  }

  const overview = data?.overview || {};
  const byCategory = Array.isArray(data?.byCategory) ? data.byCategory : [];
  const bySubCategory = Array.isArray(data?.bySubCategory) ? data.bySubCategory : [];
  const byBankAccount = Array.isArray(data?.byBankAccount) ? data.byBankAccount : [];
  const byBankAccountAndMethod = Array.isArray(data?.byBankAccountAndMethod) ? data.byBankAccountAndMethod : [];
  const pendingByUser = Array.isArray(data?.pendingByUser) ? data.pendingByUser : [];

  return (
    <View style={styles.root}>
      {showHeader ? (
        <View style={[styles.hero, phone && styles.heroPhone, narrow && styles.heroNarrow]}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name="chart-donut-variant" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text style={styles.heroEyebrow}>COLLECTION SUMMARY</Text>
            <Text style={[styles.heroTitle, phone && styles.heroTitlePhone]}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          {loading ? <ActivityIndicator color="#FFFFFF" /> : null}
        </View>
      ) : null}

      {error ? <Text style={styles.inlineError}>{error}</Text> : null}

      {collapsibleSections ? (
        <>
          <CollapsibleSection
            title="Collection overview"
            subtitle="Collected, deposited and pending balances at a glance."
            icon="chart-donut-variant"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <View style={styles.overviewGrid}>
              <OverviewTile phone={phone} icon="cash-multiple" label="Total collected" value={overview.totalCollected} />
              <OverviewTile phone={phone} icon="bank-transfer" label="Total deposited" value={overview.totalDeposited} tone="success" />
              <OverviewTile phone={phone} icon="cash-clock" label="Pending to deposit" value={overview.pendingToDeposit} tone="danger" />
              <OverviewTile phone={phone} icon="cash" label="Pending cash" value={overview.currentPendingCashBalance} tone="warning" />
              <OverviewTile phone={phone} icon="checkbook" label="Pending cheque" value={overview.currentPendingChequeBalance} tone="warning" />
            </View>
          </CollapsibleSection>

          <CollapsibleSection
            title="Pending collection ownership"
            subtitle="Who holds pending cash or cheque and the bank account it belongs to."
            icon="cash-clock"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <PendingByUser items={pendingByUser} phone={phone} showHeading={false} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Bank account balances"
            subtitle="Opening, current, pending cash and pending cheque for every account."
            icon="bank-outline"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <BankAccountSection items={byBankAccount} phone={phone} showHeading={false} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Payment categories"
            subtitle="Collection volume grouped by payment category."
            icon="shape-outline"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <BreakdownSection
              title="Payment categories"
              items={byCategory}
              nameForItem={item => item.categoryName || `Category ${item.categoryId}`}
              amountForItem={item => item.totalAmount}
              metaForItem={item => `${number(item.paymentCount)} payment${number(item.paymentCount) === 1 ? "" : "s"}`}
              emptyText="No category collection data is available."
              showHeading={false}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Payment sub-categories"
            subtitle="Detailed collection split below each payment category."
            icon="format-list-bulleted-type"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <BreakdownSection
              title="Payment sub-categories"
              items={bySubCategory}
              nameForItem={item => item.subCategoryName || "No sub-category"}
              amountForItem={item => item.totalAmount}
              metaForItem={item => `${item.categoryName || "Category"} · ${number(item.paymentCount)} payment${number(item.paymentCount) === 1 ? "" : "s"}`}
              emptyText="No sub-category collection data is available."
              showHeading={false}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Bank account & payment method"
            subtitle="How cash, cheque and other payment methods flow into each bank account."
            icon="bank-transfer-in"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <BankMethodSection items={byBankAccountAndMethod} showHeading={false} />
          </CollapsibleSection>

          <CollapsibleSection
            title="Collection by user"
            subtitle="Collector-wise totals and payment-method mix."
            icon="account-group-outline"
            defaultExpanded={!defaultCollapsed}
            phone={phone}
          >
            <UserCollections
              data={data?.byUser}
              onPageChange={onUserPageChange}
              loading={userPageLoading}
              phone={phone}
              showHeading={false}
            />
          </CollapsibleSection>
        </>
      ) : (
        <>
          <View style={styles.overviewGrid}>
            <OverviewTile phone={phone} icon="cash-multiple" label="Total collected" value={overview.totalCollected} />
            <OverviewTile phone={phone} icon="bank-transfer" label="Total deposited" value={overview.totalDeposited} tone="success" />
            <OverviewTile phone={phone} icon="cash-clock" label="Pending to deposit" value={overview.pendingToDeposit} tone="danger" />
            <OverviewTile phone={phone} icon="cash" label="Pending cash" value={overview.currentPendingCashBalance} tone="warning" />
            <OverviewTile phone={phone} icon="checkbook" label="Pending cheque" value={overview.currentPendingChequeBalance} tone="warning" />
          </View>

          <PendingByUser items={pendingByUser} phone={phone} />
          <BankAccountSection items={byBankAccount} phone={phone} />

          <View style={[styles.twoColumn, phone && styles.twoColumnPhone]}>
            <View style={styles.column}>
              <BreakdownSection
                title="Payment categories"
                subtitle="Collection volume by category"
                items={byCategory}
                nameForItem={item => item.categoryName || `Category ${item.categoryId}`}
                amountForItem={item => item.totalAmount}
                metaForItem={item => `${number(item.paymentCount)} payment${number(item.paymentCount) === 1 ? "" : "s"}`}
                emptyText="No category collection data is available."
              />
            </View>
            <View style={styles.column}>
              <BreakdownSection
                title="Payment sub-categories"
                subtitle="Detailed collection split"
                items={bySubCategory}
                nameForItem={item => item.subCategoryName || "No sub-category"}
                amountForItem={item => item.totalAmount}
                metaForItem={item => `${item.categoryName || "Category"} · ${number(item.paymentCount)} payment${number(item.paymentCount) === 1 ? "" : "s"}`}
                emptyText="No sub-category collection data is available."
              />
            </View>
          </View>

          <BankMethodSection items={byBankAccountAndMethod} />
          <UserCollections
            data={data?.byUser}
            onPageChange={onUserPageChange}
            loading={userPageLoading}
            phone={phone}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%", gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  accordion: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  accordionExpanded: { borderColor: colors.primarySoftStrong, ...shadows.card },
  accordionHeader: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  accordionHeaderPhone: { minHeight: 72, paddingHorizontal: spacing.sm },
  accordionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  accordionTitle: { color: colors.text, fontSize: 16, fontWeight: "900" },
  accordionSubtitle: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  accordionAnimatedBody: { overflow: "hidden" },
  accordionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md
  },
  inlineLoader: { marginVertical: spacing.sm },
  hero: {
    minHeight: 128,
    borderRadius: radius.xl,
    padding: spacing.lg,
    backgroundColor: colors.primaryStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.card
  },
  heroPhone: { padding: spacing.md, alignItems: "flex-start" },
  heroNarrow: { flexDirection: "column" },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.16)"
  },
  heroEyebrow: { color: "#D8E6E0", fontSize: 9, fontWeight: "900", letterSpacing: 1.4 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, fontWeight: "900", marginTop: 4 },
  heroTitlePhone: { fontSize: 22 },
  heroSubtitle: { color: "#DDE6E2", fontSize: 12, lineHeight: 18, marginTop: 5 },
  overviewGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  overviewTile: {
    flex: 1,
    minWidth: 180,
    minHeight: 126,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: colors.surface
  },
  overviewTilePhone: { minWidth: "47%", flexBasis: "47%" },
  overviewPrimary: { borderColor: colors.primarySoftStrong, backgroundColor: colors.surfaceTint },
  overviewSuccess: { borderColor: "#D8EADC", backgroundColor: colors.successSoft },
  overviewWarning: { borderColor: "#F0DFC3", backgroundColor: colors.warningSoft },
  overviewDanger: { borderColor: "#F3D6D6", backgroundColor: colors.dangerSoft },
  overviewIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.68)",
    marginBottom: spacing.sm
  },
  overviewLabel: { color: colors.textSoft, fontSize: 11, fontWeight: "800" },
  overviewValue: { color: colors.text, fontSize: 20, fontWeight: "900", marginTop: 4, minWidth: 0 },
  blockHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  blockIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  blockTitle: { color: colors.text, fontSize: 19, fontWeight: "900" },
  blockSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3, lineHeight: 17 },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  bankCard: { flex: 1, minWidth: 280, marginBottom: 0 },
  bankCardPhone: { minWidth: "100%", width: "100%" },
  fullWidthCard: { width: "100%", marginBottom: 0 },
  bankHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bankBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  bankName: { color: colors.text, fontSize: 16, fontWeight: "900" },
  bankCaption: { color: colors.muted, fontSize: 10, marginTop: 2 },
  currentBalance: { color: colors.primaryStrong, fontSize: 25, fontWeight: "900", marginTop: spacing.md },
  balanceGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  balanceMetric: { minWidth: 112, flex: 1, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.backgroundAlt },
  balanceMetricLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" },
  balanceMetricValue: { color: colors.text, fontSize: 13, fontWeight: "900", marginTop: 3 },
  dangerText: { color: colors.danger },
  twoColumn: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  twoColumnPhone: { flexDirection: "column" },
  column: { flex: 1, minWidth: 0, width: "100%" },
  sectionCard: { marginBottom: 0, width: "100%" },
  sectionHeading: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  sectionHeadingPhone: { flexWrap: "wrap" },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 17 },
  breakdownRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  breakdownTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  breakdownName: { color: colors.text, fontSize: 13, fontWeight: "800" },
  breakdownMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  breakdownAmount: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900", flexShrink: 0 },
  track: { height: 8, marginTop: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.backgroundAlt, overflow: "hidden" },
  bar: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primaryStrong },
  methodGroup: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  methodGroupHeader: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.xs },
  methodBankName: { color: colors.text, fontWeight: "900", fontSize: 14, flex: 1 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  methodName: { color: colors.text, fontWeight: "800", fontSize: 12 },
  methodMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  pendingPill: { maxWidth: "48%", paddingHorizontal: 9, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.warningSoft },
  pendingPillText: { color: colors.warning, fontSize: 10, fontWeight: "900" },
  settledPill: { backgroundColor: colors.successSoft },
  settledPillText: { color: colors.success },
  userRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  userAvatar: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  userTitleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  userName: { color: colors.text, fontSize: 13, fontWeight: "900", flex: 1, minWidth: 0 },
  userTotal: { color: colors.primaryStrong, fontSize: 13, fontWeight: "900", flexShrink: 0 },
  userMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  userMethodChips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: spacing.xs },
  userChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.backgroundAlt },
  userChipText: { color: colors.textSoft, fontSize: 9, fontWeight: "800" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, marginTop: spacing.md },
  paginationPhone: { gap: spacing.xs },
  pageText: { color: colors.muted, fontSize: 11, fontWeight: "800", textAlign: "center" },
  pendingCard: { marginBottom: 0, borderColor: "#F0DFC3", backgroundColor: "#FFFDF8" },
  pendingHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  pendingHeaderIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.warningSoft, alignItems: "center", justifyContent: "center" },
  pendingTitle: { color: colors.text, fontSize: 18, fontWeight: "900" },
  pendingSubtitle: { color: colors.muted, fontSize: 11, marginTop: 3, lineHeight: 17 },
  pendingGroup: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#EEDFC5" },
  pendingGroupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  pendingGroupHeaderPhone: { alignItems: "flex-start", flexWrap: "wrap" },
  pendingBank: { color: colors.text, fontSize: 14, fontWeight: "900" },
  pendingBankMeta: { color: colors.muted, fontSize: 10, marginTop: 3 },
  pendingBankTotal: { color: colors.warning, fontSize: 16, fontWeight: "900" },
  pendingUserRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm, paddingVertical: spacing.sm },
  pendingUser: { color: colors.text, fontSize: 12, fontWeight: "800" },
  pendingType: { color: colors.muted, fontSize: 9, marginTop: 2, textTransform: "capitalize" },
  pendingAmount: { color: colors.danger, fontSize: 12, fontWeight: "900", flexShrink: 0 },
  loadingState: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  loadingText: { color: colors.muted, fontSize: 12 },
  error: { color: colors.danger, marginBottom: spacing.md },
  inlineError: { color: colors.danger, fontSize: 12 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: spacing.lg, fontSize: 12 }
});
