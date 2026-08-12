import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";

import { mumineenApi } from "../../src/api/mumineenApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import { colors, radius, shadows, spacing } from "../../src/theme";

const PAGE_SIZE = 20;

function getDisplayName(mumin) {
  return (
    mumin.fullName ||
    [mumin.firstName, mumin.fatherName, mumin.surname]
      .filter(Boolean)
      .join(" ") ||
    "Unnamed Mumin"
  );
}

function getInitials(mumin) {
  const parts = getDisplayName(mumin).split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || "M"}${parts[parts.length - 1]?.[0] || ""}`.toUpperCase();
}

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "Unknown size";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UsersScreen() {
  const { width } = useWindowDimensions();
  const phone = width < 600;
  const narrow = width < 380;
  const [mumineen, setMumineen] = useState([]);
  const [query, setQuery] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedFile, setSelectedFile] = useState(null);
  const [pickingFile, setPickingFile] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => loadMumineen(pageNumber, query), 350);
    return () => clearTimeout(timer);
  }, [pageNumber, query]);

  async function loadMumineen(page, searchValue = query) {
    const id = ++requestId.current;
    try {
      setError("");
      setLoading(true);
      const result = await mumineenApi.getPaged(page, PAGE_SIZE, searchValue.trim());
      if (id !== requestId.current) return;
      setMumineen(Array.isArray(result?.items) ? result.items : []);
      setTotalCount(Number(result?.totalCount || 0));
      setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
    } catch (requestError) {
      if (id !== requestId.current) return;
      setMumineen([]);
      setError(requestError.message || "Unable to load Mumineen.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  async function chooseExcel() {
    try {
      setImportError("");
      setPickingFile(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel"
        ],
        copyToCacheDirectory: true,
        multiple: false
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const lowerName = String(asset.name || "").toLowerCase();
      if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
        throw new Error("Please select an .xlsx or .xls Mumineen workbook.");
      }
      setSelectedFile(asset);
    } catch (requestError) {
      setSelectedFile(null);
      setImportError(requestError.message || "Unable to select the Excel file.");
    } finally {
      setPickingFile(false);
    }
  }

  async function importExcel() {
    if (!selectedFile) return;
    try {
      setImporting(true);
      setImportError("");
      const created = await mumineenApi.uploadExcel(selectedFile, { timeoutMs: 180000 });
      const importedCount = Array.isArray(created) ? created.length : null;
      setSelectedFile(null);
      setQuery("");
      if (pageNumber === 1) await loadMumineen(1, "");
      else setPageNumber(1);
      Alert.alert(
        "Mumineen imported",
        importedCount == null
          ? "The Excel file was imported successfully."
          : `${importedCount} Mumineen records were imported successfully.`
      );
    } catch (requestError) {
      setImportError(requestError.message || "The Mumineen Excel import failed.");
    } finally {
      setImporting(false);
    }
  }

  const firstRecord = totalCount === 0 ? 0 : (pageNumber - 1) * PAGE_SIZE + 1;
  const lastRecord = Math.min(pageNumber * PAGE_SIZE, totalCount);

  return (
    <Screen>
      <View style={[styles.titleRow, phone && styles.titleRowPhone]}>
        <View style={styles.titleContent}>
          <Text style={styles.title}>Mumineen</Text>
          <Text style={styles.subtitle}>
            Search and manage Mumineen for the current Jamaat.
          </Text>
        </View>
        <Button
          title="Import Mumineen"
          compact
          loading={pickingFile}
          disabled={importing}
          onPress={chooseExcel}
          style={[styles.importButton, phone && styles.importButtonPhone]}
        />
      </View>

      <Input
        label="Search Mumineen"
        value={query}
        onChangeText={value => {
          setQuery(value);
          setPageNumber(1);
        }}
        placeholder="Name, ITS ID, mobile, family ID..."
      />

      {error ? (
        <Card>
          <Text style={styles.error}>{error}</Text>
          <Button title="Try again" variant="outline" compact onPress={() => loadMumineen(pageNumber)} />
        </Card>
      ) : null}

      <View style={[styles.summaryRow, narrow && styles.summaryRowNarrow]}>
        <View>
          <Text style={styles.resultCount}>{totalCount} Mumineen</Text>
          <Text style={styles.rangeText}>
            Showing {firstRecord}-{lastRecord} · Page {pageNumber} of {totalPages}
          </Text>
        </View>
        {loading ? <ActivityIndicator color={colors.primaryStrong} /> : null}
      </View>

      {!loading && !error && mumineen.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>No Mumineen found</Text>
          <Text style={styles.emptyText}>Try a different name, ITS ID, mobile or family ID.</Text>
        </Card>
      ) : null}

      {mumineen.map(mumin => (
        <Pressable
          key={String(mumin.muminId)}
          onPress={() =>
            router.push({
              pathname: "/(app)/user-detail",
              params: { muminId: String(mumin.muminId) }
            })
          }
        >
          <Card style={[styles.userCard, narrow && styles.userCardNarrow]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(mumin)}</Text>
            </View>
            <View style={styles.content}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{getDisplayName(mumin)}</Text>
                <View style={[styles.statusBadge, !mumin.isActive && styles.statusBadgeInactive]}>
                  <Text style={[styles.statusText, !mumin.isActive && styles.statusTextInactive]}>
                    {mumin.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>
              </View>
              <Text style={styles.meta}>ITS {mumin.itsId || "-"}</Text>
              <Text style={styles.meta}>
                {mumin.mobile || "No mobile number"}
                {mumin.hofFmType ? ` · ${mumin.hofFmType}` : ""}
              </Text>
              <Text style={styles.jamaat}>
                {mumin.jamaatName || mumin.jamaat || "Jamaat not specified"}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Card>
        </Pressable>
      ))}

      <View style={styles.pagination}>
        <Button title="Previous" variant="outline" compact disabled={loading || pageNumber <= 1} onPress={() => setPageNumber(current => Math.max(1, current - 1))} />
        <Text style={styles.pageLabel}>{pageNumber} / {totalPages}</Text>
        <Button title="Next" variant="outline" compact disabled={loading || pageNumber >= totalPages} onPress={() => setPageNumber(current => Math.min(totalPages, current + 1))} />
      </View>

      <Modal
        visible={Boolean(selectedFile || importError)}
        transparent
        animationType="fade"
        onRequestClose={() => !importing && (setSelectedFile(null), setImportError(""))}
      >
        <View style={[styles.modalOverlay, phone && styles.modalOverlayPhone]}>
          <View style={[styles.modalCard, phone && styles.modalCardPhone]}>
            <View style={[styles.modalHeader, phone && styles.modalHeaderPhone]}>
              <View style={styles.titleContent}>
                <Text style={styles.modalTitle}>Import Mumineen Excel</Text>
                <Text style={styles.modalSubtitle}>
                  Review the selected Excel workbook before importing Mumineen records.
                </Text>
              </View>
              <Pressable disabled={importing} onPress={() => { setSelectedFile(null); setImportError(""); }} style={styles.closeButton}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>

            <View style={[styles.modalBody, phone && styles.modalBodyPhone]}>
              {selectedFile ? (
                <View style={styles.fileCard}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileMeta}>{formatBytes(selectedFile.size)} · Excel workbook</Text>
                </View>
              ) : null}
              {importError ? <Text style={styles.importError}>{importError}</Text> : null}
            </View>

            <View style={[styles.modalActions, phone && styles.modalActionsPhone]}>
              <Button title="Choose another file" compact variant="outline" disabled={importing} loading={pickingFile} onPress={chooseExcel} />
              <Button title="Upload & import" compact disabled={!selectedFile || importing} loading={importing} onPress={importExcel} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md, marginBottom: spacing.lg },
  titleRowPhone: { flexDirection: "column", alignItems: "stretch", gap: spacing.sm },
  titleContent: { flex: 1 },
  title: { fontSize: 26, fontWeight: "800", color: colors.text },
  subtitle: { color: colors.muted, lineHeight: 20, marginTop: spacing.xs },
  importButton: { flexShrink: 0 },
  importButtonPhone: { width: "100%" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  summaryRowNarrow: { alignItems: "flex-start", flexDirection: "column", gap: 3 },
  resultCount: { color: colors.text, fontWeight: "800" },
  rangeText: { color: colors.muted, fontSize: 12, marginTop: 3 },
  userCard: { flexDirection: "row", alignItems: "center" },
  userCardNarrow: { alignItems: "flex-start" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  avatarText: { color: "#FFFFFF", fontWeight: "800" },
  content: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  name: { color: colors.text, fontSize: 17, fontWeight: "800", marginRight: spacing.sm, flexShrink: 1 },
  statusBadge: { backgroundColor: colors.primarySoft, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeInactive: { backgroundColor: colors.dangerSoft },
  statusText: { color: colors.primaryStrong, fontSize: 10, fontWeight: "800" },
  statusTextInactive: { color: colors.danger },
  meta: { color: colors.muted, marginTop: 3 },
  jamaat: { color: colors.primaryStrong, fontWeight: "700", marginTop: 5 },
  chevron: { color: colors.muted, fontSize: 34 },
  error: { color: colors.danger, marginBottom: spacing.md },
  emptyTitle: { color: colors.text, fontWeight: "800" },
  emptyText: { color: colors.muted, marginTop: spacing.xs },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.md, marginTop: spacing.lg },
  pageLabel: { minWidth: 70, textAlign: "center", color: colors.text, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(20,30,27,.55)", alignItems: "center", justifyContent: "center", padding: spacing.md },
  modalOverlayPhone: { justifyContent: "flex-end", padding: 0 },
  modalCard: { width: "100%", maxWidth: 650, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...shadows.card },
  modalCardPhone: { maxHeight: "94%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: colors.border, padding: spacing.lg },
  modalHeaderPhone: { padding: spacing.md },
  modalTitle: { color: colors.text, fontSize: 21, fontWeight: "800" },
  modalSubtitle: { color: colors.muted, marginTop: spacing.xs, lineHeight: 19 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.backgroundAlt, marginLeft: spacing.md },
  closeText: { color: colors.text, fontSize: 25, lineHeight: 27 },
  modalBody: { padding: spacing.lg },
  modalBodyPhone: { padding: spacing.md },
  fileCard: { backgroundColor: colors.backgroundAlt, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  fileName: { color: colors.text, fontWeight: "800" },
  fileMeta: { color: colors.muted, marginTop: spacing.xs, fontSize: 12 },
  importError: { color: colors.danger, marginTop: spacing.md },
  modalActionsPhone: { padding: spacing.md },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg }
});
