import React, { useMemo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import { colors, radius, spacing } from "../theme";

const FIELD_LABELS = {
  muminId: "Mumin",
  muminName: "Mumin",
  itsNo: "ITS ID",
  muminItsNo: "ITS ID",
  categoryId: "Category",
  categoryName: "Category",
  subCategoryId: "Subcategory",
  subCategoryName: "Subcategory",
  amount: "Amount",
  paymentMethodId: "Payment method",
  paymentMethodName: "Payment method",
  paymentReference: "Reference",
  paymentReferenceNo: "Reference",
  depositReferenceNo: "Reference",
  bankAccountId: "Bank account",
  bankAccountName: "Bank account",
  accountName: "Bank account",
  depositDate: "Deposit date",
  paymentFor: "Payment for",
  entryType: "Entry type",
  status: "Status",
  remarks: "Remarks",
  description: "Description",
  createdByName: "Created by",
  updatedByName: "Updated by",
  recordedByName: "Recorded by",
  isActive: "Active"
};

const HIDDEN_KEYS = new Set([
  "paymentId",
  "paymentLogId",
  "dayBookId",
  "dayBookLogId",
  "bankDepositId",
  "bankDepositLogId",
  "jamaatId",
  "tenantId",
  "createdBy",
  "updatedBy",
  "performedBy",
  "createdAt",
  "updatedAt",
  "performedAt"
]);

function safeParse(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "string" && parsed !== trimmed) {
      return safeParse(parsed);
    }
    return parsed;
  } catch {
    return null;
  }
}

function humanizeKey(key) {
  const plainKey = String(key || "").split(".").pop();
  if (FIELD_LABELS[plainKey]) return FIELD_LABELS[plainKey];

  return plainKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\bid\b/gi, "ID")
    .replace(/\b\w/g, match => match.toUpperCase());
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function looksLikeDate(key, value) {
  if (typeof value !== "string") return false;
  if (!/(date|at)$/i.test(String(key || ""))) return false;
  return Number.isFinite(new Date(value).getTime());
}

function formatValue(key, value) {
  if (value == null || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (/amount/i.test(String(key || "")) && Number.isFinite(Number(value))) {
    return formatMoney(value);
  }

  if (looksLikeDate(key, value)) {
    return new Date(value).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: /at$/i.test(String(key || "")) ? "2-digit" : undefined,
      minute: /at$/i.test(String(key || "")) ? "2-digit" : undefined
    });
  }

  if (Array.isArray(value)) {
    if (!value.length) return "None";
    if (value.every(item => ["string", "number", "boolean"].includes(typeof item))) {
      return value.join(", ");
    }
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }

  if (typeof value === "object") return "Updated";
  return String(value);
}

function hasFriendlySibling(object, key) {
  if (!key.endsWith("Id")) return false;
  const base = key.slice(0, -2);
  return Object.prototype.hasOwnProperty.call(object, `${base}Name`);
}

function flattenData(value, prefix = "", depth = 0) {
  const parsed = safeParse(value) ?? value;
  if (!parsed || typeof parsed !== "object") return {};
  if (depth > 3) return {};

  const result = {};

  if (Array.isArray(parsed)) {
    parsed.forEach((item, index) => {
      if (item && typeof item === "object") {
        const fieldName = item.fieldName || item.name || item.label || item.fieldKey;
        const fieldValue = item.value ?? item.fieldValue ?? item.newValue;
        if (fieldName && fieldValue !== undefined) {
          result[String(fieldName)] = fieldValue;
        } else {
          Object.assign(result, flattenData(item, `${prefix}${index + 1}.`, depth + 1));
        }
      }
    });
    return result;
  }

  Object.entries(parsed).forEach(([key, rawValue]) => {
    if (HIDDEN_KEYS.has(key)) return;
    if (hasFriendlySibling(parsed, key)) return;

    const fullKey = prefix ? `${prefix}${key}` : key;

    const parsedNestedValue = typeof rawValue === "string" ? safeParse(rawValue) : rawValue;
    if (parsedNestedValue && typeof parsedNestedValue === "object") {
      if (key === "fieldValues" && Array.isArray(parsedNestedValue)) {
        Object.assign(result, flattenData(parsedNestedValue, "", depth + 1));
        return;
      }

      const nested = flattenData(parsedNestedValue, `${fullKey}.`, depth + 1);
      if (Object.keys(nested).length) Object.assign(result, nested);
      return;
    }

    result[fullKey] = rawValue;
  });

  return result;
}

function comparable(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function buildChanges(oldData, newData) {
  const oldFields = flattenData(oldData);
  const newFields = flattenData(newData);
  const keys = Array.from(new Set([...Object.keys(oldFields), ...Object.keys(newFields)]));

  return keys
    .filter(key => comparable(oldFields[key]) !== comparable(newFields[key]))
    .map(key => ({
      key,
      label: humanizeKey(key),
      oldValue: Object.prototype.hasOwnProperty.call(oldFields, key)
        ? formatValue(key, oldFields[key])
        : null,
      newValue: Object.prototype.hasOwnProperty.call(newFields, key)
        ? formatValue(key, newFields[key])
        : null
    }));
}

function actionPresentation(actionType, entityLabel) {
  const action = String(actionType || "Activity").trim().toUpperCase();

  if (/(CREATE|ADD|INSERT|NEW)/.test(action)) {
    return { label: "Created", icon: "plus", tone: "success" };
  }
  if (/(UPDATE|EDIT|MODIFY|CHANGE)/.test(action)) {
    return { label: "Updated", icon: "pencil-outline", tone: "info" };
  }
  if (/(REFUND)/.test(action)) {
    return entityLabel === "Payment"
      ? { label: "Deleted", icon: "delete-outline", tone: "danger" }
      : { label: "Refunded", icon: "cash", tone: "warning" };
  }
  if (/(DELETE|REMOVE|DEACTIVATE)/.test(action)) {
    return { label: "Deleted", icon: "delete-outline", tone: "danger" };
  }
  if (/(RESTORE|ACTIVATE)/.test(action)) {
    return { label: "Restored", icon: "backup-restore", tone: "success" };
  }

  return {
    label: String(actionType || "Activity")
      .replace(/[_-]+/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, match => match.toUpperCase()),
    icon: "history",
    tone: "default"
  };
}

function toneColors(tone) {
  switch (tone) {
    case "success":
      return { background: colors.successSoft, foreground: colors.success };
    case "danger":
      return { background: colors.dangerSoft, foreground: colors.danger };
    case "warning":
      return { background: colors.warningSoft, foreground: colors.warning };
    case "info":
      return { background: colors.infoSoft, foreground: colors.info };
    default:
      return { background: colors.primarySoft, foreground: colors.primary };
  }
}

function ChangeRow({ change }) {
  const hasOld = change.oldValue !== null;
  const hasNew = change.newValue !== null;

  return (
    <View style={styles.changeRow}>
      <Text style={styles.changeLabel}>{change.label}</Text>
      {hasOld && hasNew ? (
        <View style={styles.valueChange}>
          <Text style={[styles.valueText, styles.oldValue]}>{change.oldValue}</Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={15}
            color={colors.muted}
            style={styles.changeArrow}
          />
          <Text style={[styles.valueText, styles.newValue]}>{change.newValue}</Text>
        </View>
      ) : hasNew ? (
        <Text style={[styles.valueText, styles.newValue]}>{change.newValue}</Text>
      ) : (
        <Text style={[styles.valueText, styles.oldValue]}>Removed ({change.oldValue})</Text>
      )}
    </View>
  );
}

export default function ActivityTimeline({
  entries = [],
  entityLabel = "Record",
  getKey,
  formatDateTime
}) {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const normalizedEntries = useMemo(
    () =>
      (Array.isArray(entries) ? entries : []).map((entry, index) => ({
        entry,
        index,
        changes: buildChanges(entry?.oldData, entry?.newData),
        presentation: actionPresentation(entry?.actionType, entityLabel)
      })),
    [entries, entityLabel]
  );

  if (!normalizedEntries.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <MaterialCommunityIcons name="history" size={26} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No activity yet</Text>
        <Text style={styles.emptyText}>Changes to this {entityLabel.toLowerCase()} will appear here.</Text>
      </View>
    );
  }

  return (
    <View style={styles.timeline}>
      {normalizedEntries.map(({ entry, index, changes, presentation }) => {
        const tone = toneColors(presentation.tone);
        const isLast = index === normalizedEntries.length - 1;
        const actor = entry?.performedByName || (entry?.performedBy ? `User ${entry.performedBy}` : "System");
        const timestamp = formatDateTime ? formatDateTime(entry?.performedAt) : String(entry?.performedAt || "");

        return (
          <View
            key={getKey ? getKey(entry, index) : String(entry?.id || `${entry?.performedAt || "activity"}-${index}`)}
            style={[styles.timelineRow, phone && styles.timelineRowPhone]}
          >
            <View style={[styles.rail, phone && styles.railPhone]}>
              <View style={[styles.dot, phone && styles.dotPhone, { backgroundColor: tone.background, borderColor: tone.foreground }]}> 
                <MaterialCommunityIcons name={presentation.icon} size={16} color={tone.foreground} />
              </View>
              {!isLast ? <View style={styles.line} /> : null}
            </View>

            <View style={[styles.content, phone && styles.contentPhone]}>
              <View style={styles.eventHeader}>
                <View style={[styles.actionBadge, { backgroundColor: tone.background }]}> 
                  <Text style={[styles.actionText, { color: tone.foreground }]}>{presentation.label}</Text>
                </View>
                <Text style={styles.entityText}>{entityLabel}</Text>
              </View>

              <View style={[styles.metaRow, narrow && styles.metaRowNarrow]}>
                <MaterialCommunityIcons name="account-outline" size={15} color={colors.muted} />
                <Text style={styles.metaText}>{actor}</Text>
                <Text style={styles.metaDot}>•</Text>
                <MaterialCommunityIcons name="clock-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText}>{timestamp || "-"}</Text>
              </View>

              {changes.length ? (
                <View style={styles.changesCard}>
                  {changes.map((change, changeIndex) => (
                    <View key={`${change.key}-${changeIndex}`}>
                      <ChangeRow change={change} />
                      {changeIndex < changes.length - 1 ? <View style={styles.changeDivider} /> : null}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.summaryText}>
                  {presentation.label === "Created"
                    ? `This ${entityLabel.toLowerCase()} was created.`
                    : presentation.label === "Deleted"
                      ? `This ${entityLabel.toLowerCase()} was deleted.`
                      : `${presentation.label} activity was recorded.`}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  timeline: { width: "100%" },
  timelineRow: { flexDirection: "row", alignItems: "stretch" },
  timelineRowPhone: { alignItems: "flex-start" },
  rail: { width: 38, alignItems: "center" },
  railPhone: { width: 32 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2
  },
  dotPhone: { width: 28, height: 28, borderRadius: 14 },
  line: { flex: 1, width: 2, backgroundColor: colors.border, minHeight: 24 },
  content: { flex: 1, minWidth: 0, paddingLeft: spacing.sm, paddingBottom: spacing.lg },
  contentPhone: { paddingLeft: spacing.xs, paddingBottom: spacing.md },
  eventHeader: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.xs },
  actionBadge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  actionText: { fontSize: 12, fontWeight: "800" },
  entityText: { color: colors.text, fontSize: 15, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 7 },
  metaRowNarrow: { alignItems: "flex-start" },
  metaText: { color: colors.muted, fontSize: 12 },
  metaDot: { color: colors.borderStrong, fontSize: 12, marginHorizontal: 1 },
  changesCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden"
  },
  changeRow: { paddingHorizontal: spacing.sm, paddingVertical: 10 },
  changeLabel: { color: colors.textSoft, fontSize: 12, fontWeight: "800", marginBottom: 5 },
  valueChange: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  valueText: { fontSize: 13, lineHeight: 18, flexShrink: 1 },
  oldValue: { color: colors.muted, textDecorationLine: "line-through" },
  newValue: { color: colors.text, fontWeight: "700" },
  changeArrow: { marginHorizontal: 1 },
  changeDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  summaryText: { color: colors.textSoft, fontSize: 13, marginTop: spacing.sm },
  emptyState: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 5 }
});
