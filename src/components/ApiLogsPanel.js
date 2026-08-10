import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { logsApi } from "../api/logsApi";
import { colors, radius, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Select from "./Select";

const PAGE_SIZE = 20;

const METHOD_OPTIONS = [
  { label: "All methods", value: "" },
  { label: "GET", value: "GET" },
  { label: "POST", value: "POST" },
  { label: "PUT", value: "PUT" },
  { label: "DELETE", value: "DELETE" },
  { label: "PATCH", value: "PATCH" }
];

const RESULT_OPTIONS = [
  { label: "All results", value: "" },
  { label: "Successful", value: "true" },
  { label: "Failed", value: "false" }
];

const EMPTY_FILTERS = {
  search: "",
  userId: "",
  method: "",
  isSuccess: "",
  fromDate: "",
  toDate: ""
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function toApiDate(value, endOfDay = false) {
  const normalized = String(value || "").trim();
  if (!normalized) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`;
  }
  const parsed = new Date(normalized);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : normalized;
}

function getErrorMessage(error) {
  return error?.apiMessage || error?.message || "Unable to load API logs.";
}

function redactObject(value) {
  if (Array.isArray(value)) return value.map(redactObject);
  if (!value || typeof value !== "object") return value;

  return Object.entries(value).reduce((result, [key, item]) => {
    if (/password|token|authorization|secret/i.test(key)) {
      result[key] = "[REDACTED]";
    } else {
      result[key] = redactObject(item);
    }
    return result;
  }, {});
}

function safeBody(value) {
  if (!value) return "-";
  const text = String(value);
  try {
    return JSON.stringify(redactObject(JSON.parse(text)), null, 2);
  } catch {
    return text
      .replace(/("?(?:password|accessToken|refreshToken|authorization)"?\s*[:=]\s*)"?[^",\s}]+"?/gi, "$1[REDACTED]")
      .slice(0, 15000);
  }
}

function StatusBadge({ success, statusCode }) {
  const ok = Boolean(success);
  return (
    <View style={[styles.badge, ok ? styles.badgeSuccess : styles.badgeFailure]}>
      <Text style={[styles.badgeText, ok ? styles.badgeTextSuccess : styles.badgeTextFailure]}>
        {statusCode || "-"} · {ok ? "Success" : "Failed"}
      </Text>
    </View>
  );
}

function DetailBlock({ label, value, mono = false }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={[styles.detailValue, mono && styles.mono]}>
        {value || "-"}
      </Text>
    </View>
  );
}

export default function ApiLogsPanel() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const rangeText = useMemo(() => {
    if (!totalCount) return "No API calls";
    const first = (pageNumber - 1) * PAGE_SIZE + 1;
    const last = Math.min(pageNumber * PAGE_SIZE, totalCount);
    return `${first}-${last} of ${totalCount}`;
  }, [pageNumber, totalCount]);

  useEffect(() => {
    loadLogs(pageNumber, appliedFilters);
  }, [pageNumber, appliedFilters]);

  async function loadLogs(page, activeFilters) {
    try {
      setLoading(true);
      setError("");
      const result = await logsApi.getPaged({
        pageNumber: page,
        pageSize: PAGE_SIZE,
        userId: activeFilters.userId ? Number(activeFilters.userId) : undefined,
        isSuccess:
          activeFilters.isSuccess === ""
            ? undefined
            : activeFilters.isSuccess === "true",
        method: activeFilters.method || undefined,
        search: activeFilters.search.trim() || undefined,
        fromDate: toApiDate(activeFilters.fromDate),
        toDate: toApiDate(activeFilters.toDate, true)
      });
      setItems(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.totalCount || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      setItems([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    setPageNumber(1);
    setAppliedFilters({ ...filters });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPageNumber(1);
    setAppliedFilters(EMPTY_FILTERS);
  }

  return (
    <View style={styles.root}>
      <View style={styles.headingRow}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>AUDIT TRAIL</Text>
          <Text style={styles.title}>API Logs</Text>
          <Text style={styles.description}>
            Track backend API calls across users, roles and endpoints using GET /api/Logs.
          </Text>
        </View>
        <Button
          title="Refresh"
          compact
          variant="outline"
          loading={loading}
          onPress={() => loadLogs(pageNumber, appliedFilters)}
        />
      </View>

      <Card style={styles.filtersCard}>
        <View style={styles.filterGrid}>
          <View style={styles.filterWide}>
            <Input
              label="Search"
              value={filters.search}
              onChangeText={search => setFilters(current => ({ ...current, search }))}
              placeholder="Endpoint, path, ITS, error..."
            />
          </View>
          <View style={styles.filterItem}>
            <Input
              label="User ID"
              value={filters.userId}
              keyboardType="number-pad"
              onChangeText={userId => setFilters(current => ({ ...current, userId }))}
              placeholder="Any user"
            />
          </View>
          <View style={styles.filterItem}>
            <Select
              label="HTTP method"
              value={filters.method}
              options={METHOD_OPTIONS}
              onChange={method => setFilters(current => ({ ...current, method }))}
            />
          </View>
          <View style={styles.filterItem}>
            <Select
              label="Result"
              value={filters.isSuccess}
              options={RESULT_OPTIONS}
              onChange={isSuccess => setFilters(current => ({ ...current, isSuccess }))}
            />
          </View>
          <View style={styles.filterItem}>
            <Input
              label="From date"
              value={filters.fromDate}
              onChangeText={fromDate => setFilters(current => ({ ...current, fromDate }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
          <View style={styles.filterItem}>
            <Input
              label="To date"
              value={filters.toDate}
              onChangeText={toDate => setFilters(current => ({ ...current, toDate }))}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>
        <View style={styles.filterActions}>
          <Button title="Apply filters" compact onPress={applyFilters} />
          <Button title="Clear" compact variant="outline" onPress={clearFilters} />
        </View>
      </Card>

      {error ? (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{rangeText}</Text>
        {loading ? <ActivityIndicator color={colors.primaryStrong} /> : null}
      </View>

      {!loading && !items.length ? (
        <Card>
          <Text style={styles.emptyTitle}>No API logs found</Text>
          <Text style={styles.emptyText}>No audit records match the selected filters.</Text>
        </Card>
      ) : null}

      {items.map(item => (
        <Pressable key={String(item.logId)} onPress={() => setSelected(item)}>
          <Card style={styles.logCard}>
            <View style={styles.logTopRow}>
              <View style={styles.methodPill}>
                <Text style={styles.methodText}>{item.requestMethod || "-"}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={styles.endpoint} numberOfLines={1}>
                  {item.endpointName || item.requestPath || "Unknown endpoint"}
                </Text>
                <Text style={styles.path} numberOfLines={2}>{item.requestPath || "-"}</Text>
              </View>
              <StatusBadge success={item.isSuccess} statusCode={item.statusCode} />
            </View>

            <View style={styles.metaGrid}>
              <Text style={styles.meta}>
                User: {item.itsNo || "Anonymous"}{item.roleName ? ` · ${item.roleName}` : ""}
              </Text>
              <Text style={styles.meta}>Duration: {Number(item.durationMs || 0)} ms</Text>
              <Text style={styles.meta}>IP: {item.ipAddress || "-"}</Text>
              <Text style={styles.meta}>{formatDateTime(item.createdAt)}</Text>
            </View>

            {item.errorMessage ? (
              <Text style={styles.inlineError} numberOfLines={2}>{item.errorMessage}</Text>
            ) : null}
          </Card>
        </Pressable>
      ))}

      <View style={styles.pagination}>
        <Button
          title="Previous"
          compact
          variant="outline"
          disabled={loading || pageNumber <= 1}
          onPress={() => setPageNumber(current => Math.max(1, current - 1))}
        />
        <Text style={styles.pageLabel}>Page {pageNumber} of {totalPages}</Text>
        <Button
          title="Next"
          compact
          variant="outline"
          disabled={loading || pageNumber >= totalPages}
          onPress={() => setPageNumber(current => Math.min(totalPages, current + 1))}
        />
      </View>

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.flex}>
                <Text style={styles.modalTitle}>API Log #{selected?.logId}</Text>
                <Text style={styles.modalSubtitle}>
                  {selected?.requestMethod || "-"} {selected?.requestPath || "-"}
                </Text>
              </View>
              <Pressable style={styles.closeButton} onPress={() => setSelected(null)}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.detailSummary}>
                <StatusBadge success={selected?.isSuccess} statusCode={selected?.statusCode} />
                <Text style={styles.meta}>{formatDateTime(selected?.createdAt)}</Text>
                <Text style={styles.meta}>{Number(selected?.durationMs || 0)} ms</Text>
              </View>
              <DetailBlock label="Endpoint name" value={selected?.endpointName} />
              <DetailBlock label="Request path" value={selected?.requestPath} mono />
              <DetailBlock label="Query string" value={selected?.queryString} mono />
              <DetailBlock
                label="User"
                value={`${selected?.itsNo || "Anonymous"}${selected?.userId ? ` · User ID ${selected.userId}` : ""}${selected?.roleName ? ` · ${selected.roleName}` : ""}`}
              />
              <DetailBlock label="IP address" value={selected?.ipAddress} />
              <DetailBlock label="User agent" value={selected?.userAgent} />
              <DetailBlock label="Request body" value={safeBody(selected?.requestBody)} mono />
              <DetailBlock label="Response body" value={safeBody(selected?.responseBody)} mono />
              {selected?.errorCode || selected?.errorMessage ? (
                <DetailBlock
                  label="Error"
                  value={`${selected?.errorCode || ""}${selected?.errorCode && selected?.errorMessage ? " · " : ""}${selected?.errorMessage || ""}`}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  flex: { flex: 1 },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xs
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "900", marginTop: 3 },
  description: { color: colors.muted, marginTop: spacing.xs, lineHeight: 20 },
  filtersCard: { padding: spacing.lg },
  filterGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  filterWide: { flexGrow: 2, flexBasis: 280, minWidth: 240 },
  filterItem: { flexGrow: 1, flexBasis: 170, minWidth: 150 },
  filterActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  errorCard: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontWeight: "700" },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  summaryText: { color: colors.muted, fontWeight: "700" },
  logCard: { marginBottom: spacing.sm },
  logTopRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  methodPill: {
    minWidth: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    alignItems: "center"
  },
  methodText: { color: colors.primaryStrong, fontWeight: "900", fontSize: 11 },
  endpoint: { color: colors.text, fontWeight: "800", fontSize: 15 },
  path: { color: colors.muted, fontSize: 12, marginTop: 3 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 5 },
  badgeSuccess: { backgroundColor: "#E6F4EF" },
  badgeFailure: { backgroundColor: colors.dangerSoft },
  badgeText: { fontSize: 10, fontWeight: "900" },
  badgeTextSuccess: { color: colors.primaryStrong },
  badgeTextFailure: { color: colors.danger },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.md },
  meta: { color: colors.muted, fontSize: 12 },
  inlineError: { color: colors.danger, fontSize: 12, marginTop: spacing.sm },
  emptyTitle: { color: colors.text, fontWeight: "800" },
  emptyText: { color: colors.muted, marginTop: spacing.xs },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.md
  },
  pageLabel: { color: colors.text, fontWeight: "800", minWidth: 110, textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(20,30,27,.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md
  },
  modalCard: {
    width: "100%",
    maxWidth: 850,
    maxHeight: "90%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: "900" },
  modalSubtitle: { color: colors.muted, marginTop: 4 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundAlt,
    marginLeft: spacing.md
  },
  closeText: { color: colors.text, fontSize: 25, lineHeight: 27 },
  modalBody: { padding: spacing.lg, paddingBottom: spacing.xl },
  detailSummary: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignItems: "center", marginBottom: spacing.md },
  detailBlock: { marginBottom: spacing.lg },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: .7 },
  detailValue: { color: colors.text, marginTop: spacing.xs, lineHeight: 20 },
  mono: { fontFamily: "monospace", fontSize: 12 },
});
