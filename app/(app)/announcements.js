import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import {
  ANNOUNCEMENT_TYPES,
  getAnnouncementTypeLabel
} from "../../src/constants/announcements";
import { colors, spacing } from "../../src/theme";

const initialForm = {
  type: "GENERAL",
  title: "",
  body: "",
  date: new Date().toISOString().slice(0, 10),
  location: "",
  isActive: true
};

export default function AnnouncementsScreen() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setItems(await apiRequest(endpoints.announcements));
    } catch (e) {
      setError(e.message);
    }
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and announcement text are required.");
      return;
    }

    try {
      await apiRequest(
        editingId
          ? endpoints.announcementById(editingId)
          : endpoints.announcements,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(form)
        }
      );
      setForm(initialForm);
      setEditingId(null);
      setError("");
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(id) {
    try {
      await apiRequest(endpoints.announcementById(id), {
        method: "DELETE"
      });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const activeCount = items.filter(item => item.isActive).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Announcements</Text>
          <Text style={styles.subtitle}>
            {activeCount}/5 active dashboard announcements
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card>
        <Text style={styles.sectionTitle}>
          {editingId ? "Edit announcement" : "Add announcement"}
        </Text>
        <Select
          label="Announcement type"
          value={form.type}
          options={ANNOUNCEMENT_TYPES}
          onChange={type =>
            setForm(current => ({ ...current, type }))
          }
        />
        <Input
          label="Title"
          value={form.title}
          onChangeText={title =>
            setForm(current => ({ ...current, title }))
          }
        />
        <Input
          label="Announcement"
          value={form.body}
          multiline
          onChangeText={body =>
            setForm(current => ({ ...current, body }))
          }
        />
        <Input
          label="Date"
          value={form.date}
          onChangeText={date =>
            setForm(current => ({ ...current, date }))
          }
        />
        <Input
          label="Location"
          value={form.location}
          onChangeText={location =>
            setForm(current => ({ ...current, location }))
          }
        />
        <Select
          label="Dashboard visibility"
          value={form.isActive ? "ACTIVE" : "INACTIVE"}
          options={[
            { label: "Active", value: "ACTIVE" },
            { label: "Inactive", value: "INACTIVE" }
          ]}
          onChange={value =>
            setForm(current => ({
              ...current,
              isActive: value === "ACTIVE"
            }))
          }
        />
        <Button
          title={editingId ? "Update announcement" : "Add announcement"}
          onPress={save}
        />
      </Card>

      {items.map(item => (
        <Card key={item.id}>
          <Text style={styles.type}>
            {getAnnouncementTypeLabel(item.type)}
          </Text>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.meta}>
            {item.date}
            {item.location ? ` · ${item.location}` : ""}
            {item.isActive ? " · Active" : " · Inactive"}
          </Text>

          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                title="Edit"
                onPress={() => {
                  setEditingId(item.id);
                  setForm({
                    type: item.type,
                    title: item.title,
                    body: item.body,
                    date: item.date,
                    location: item.location || "",
                    isActive: item.isActive
                  });
                }}
              />
            </View>
            <View style={styles.action}>
              <Button
                title="Delete"
                variant="danger"
                onPress={() =>
                  Alert.alert(
                    "Delete announcement?",
                    item.title,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => remove(item.id)
                      }
                    ]
                  )
                }
              />
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg
  },
  headerCopy: { flex: 1 },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 3
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.md
  },
  type: {
    color: colors.accent,
    fontWeight: "800"
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4
  },
  body: {
    color: colors.text,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  meta: {
    color: colors.muted,
    marginTop: spacing.sm
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  action: {
    flex: 1,
    minWidth: 120
  }
});
