import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { mumineenApi } from "../api/mumineenApi";
import { colors, spacing } from "../theme";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";

const PAGE_SIZE = 20;

function memberName(item) {
  return (
    item?.fullName ||
    [item?.firstName, item?.fatherName, item?.surname].filter(Boolean).join(" ") ||
    "Unnamed Mumin"
  );
}

export default function MumineenSearchList({
  selectedItem = null,
  onSelect,
  onClear,
  disabled = false,
  label = "Search Mumineen",
  placeholder = "Search by name, ITS ID, mobile or family ID",
  hint = "Select a Mumin to continue.",
  selectedActionLabel = "Change Mumin",
  selectActionLabel = "Select ›",
  embedded = false
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (selectedItem || disabled) return undefined;
    const timer = setTimeout(() => {
      loadItems(page, query.trim());
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(timer);
  }, [page, query, selectedItem, disabled]);

  async function loadItems(pageNumber, search) {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setError("");
      const result = await mumineenApi.getPaged(pageNumber, PAGE_SIZE, search);
      if (id !== requestId.current) return;
      const activeItems = (Array.isArray(result?.items) ? result.items : []).filter(
        item => item?.isActive !== false
      );
      setItems(activeItems);
      setMeta({
        totalCount: Number(result?.totalCount || 0),
        totalPages: Math.max(1, Number(result?.totalPages || 1))
      });
    } catch (requestError) {
      if (id !== requestId.current) return;
      setItems([]);
      setError(requestError.message || "Unable to load Mumineen.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }

  function clearSelection() {
    setQuery("");
    setPage(1);
    setItems([]);
    setMeta({ totalCount: 0, totalPages: 1 });
    onClear?.();
  }

  if (selectedItem) {
    return (
      <Card style={styles.selectedCard}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text style={styles.title}>{memberName(selectedItem)}</Text>
            <Text style={styles.meta}>
              ITS {selectedItem.itsId || "-"}
              {selectedItem.mobile ? ` · ${selectedItem.mobile}` : ""}
              {selectedItem.hofFmType ? ` · ${selectedItem.hofFmType}` : ""}
            </Text>
            {selectedItem.jamaatName || selectedItem.jamaat ? (
              <Text style={styles.meta}>
                {selectedItem.jamaatName || selectedItem.jamaat}
              </Text>
            ) : null}
          </View>
          {!disabled ? (
            <Button
              title={selectedActionLabel}
              variant="outline"
              compact
              onPress={clearSelection}
            />
          ) : null}
        </View>
      </Card>
    );
  }

  const searchContent = (
    <>
      <Input
        label={label}
        value={query}
        onChangeText={value => {
          setQuery(value);
          setPage(1);
        }}
        placeholder={placeholder}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );

  return (
    <View>
      {embedded ? searchContent : <Card>{searchContent}</Card>}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.resultHeader}>
        <Text style={styles.sectionTitle}>Mumineen</Text>
        <Text style={styles.count}>{meta.totalCount}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : items.length ? (
        items.map(item => (
          <Pressable
            key={String(item.muminId)}
            onPress={() => {
              setQuery("");
              setPage(1);
              onSelect?.(item);
            }}
          >
            <Card style={styles.memberCard}>
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.title}>{memberName(item)}</Text>
                  <Text style={styles.meta}>
                    ITS {item.itsId || "-"}
                    {item.mobile ? ` · ${item.mobile}` : ""}
                    {item.hofFmType ? ` · ${item.hofFmType}` : ""}
                  </Text>
                  {item.jamaatName || item.jamaat ? (
                    <Text style={styles.meta}>{item.jamaatName || item.jamaat}</Text>
                  ) : null}
                </View>
                <Text style={styles.open}>{selectActionLabel}</Text>
              </View>
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>No Mumineen found.</Text>
        </Card>
      )}

      <View style={styles.pagination}>
        <Button
          title="Previous"
          compact
          variant="outline"
          disabled={page <= 1 || loading}
          onPress={() => setPage(value => Math.max(1, value - 1))}
        />
        <Text style={styles.pageText}>Page {page} of {meta.totalPages}</Text>
        <Button
          title="Next"
          compact
          variant="outline"
          disabled={page >= meta.totalPages || loading}
          onPress={() => setPage(value => value + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  selectedCard: { marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start" },
  flex: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: "800" },
  meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
  hint: { color: colors.muted, fontSize: 12, marginTop: -spacing.xs },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  count: {
    color: colors.primaryStrong,
    backgroundColor: colors.primarySoft,
    minWidth: 34,
    textAlign: "center",
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    fontWeight: "800",
    fontSize: 12
  },
  memberCard: { marginBottom: spacing.xs },
  open: { color: colors.primary, fontWeight: "800", alignSelf: "center" },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: spacing.md },
  loader: { marginVertical: spacing.lg },
  error: { color: colors.danger, marginTop: spacing.sm },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginVertical: spacing.md
  },
  pageText: { color: colors.muted, fontSize: 12, fontWeight: "700" }
});
