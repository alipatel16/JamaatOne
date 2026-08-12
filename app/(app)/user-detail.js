import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { mumineenApi } from "../../src/api/mumineenApi";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import { colors, spacing } from "../../src/theme";

const ACTIVE_OPTIONS = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" }
];

const GENDER_OPTIONS = [
  { label: "Not specified", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" }
];

function valueOrEmpty(value) {
  return value == null ? "" : String(value);
}

function buildForm(mumin) {
  return {
    itsId: valueOrEmpty(mumin.itsId),
    fullName: valueOrEmpty(mumin.fullName),
    firstName: valueOrEmpty(mumin.firstName),
    fatherName: valueOrEmpty(mumin.fatherName),
    surname: valueOrEmpty(mumin.surname),
    hofFmType: valueOrEmpty(mumin.hofFmType),
    hofId: valueOrEmpty(mumin.hofId),
    familyId: valueOrEmpty(mumin.familyId),
    mobile: valueOrEmpty(mumin.mobile),
    whatsAppNo: valueOrEmpty(mumin.whatsAppNo),
    email: valueOrEmpty(mumin.email),
    age: valueOrEmpty(mumin.age),
    gender: valueOrEmpty(mumin.gender),
    maritalStatus: valueOrEmpty(mumin.maritalStatus),
    bloodGroup: valueOrEmpty(mumin.bloodGroup),
    category: valueOrEmpty(mumin.category),
    occupation: valueOrEmpty(mumin.occupation),
    qualification: valueOrEmpty(mumin.qualification),
    address: valueOrEmpty(mumin.address),
    building: valueOrEmpty(mumin.building),
    street: valueOrEmpty(mumin.street),
    area: valueOrEmpty(mumin.area),
    city: valueOrEmpty(mumin.city),
    state: valueOrEmpty(mumin.state),
    pincode: valueOrEmpty(mumin.pincode),
    isActive: String(mumin.isActive !== false)
  };
}

function toNullableNumber(value) {
  if (value === "" || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ReadOnlyRow({ label, value }) {
  return (
    <View style={styles.readOnlyRow}>
      <Text style={styles.readOnlyLabel}>{label}</Text>
      <Text style={styles.readOnlyValue}>{value || "-"}</Text>
    </View>
  );
}

export default function UserDetailScreen() {
  const params = useLocalSearchParams();
  const muminId = Array.isArray(params.muminId)
    ? params.muminId[0]
    : params.muminId;

  const [mumin, setMumin] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadMumin();
  }, [muminId]);

  async function loadMumin() {
    if (!muminId) {
      setError("Mumin ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setError("");
      setLoading(true);
      const result = await mumineenApi.getById(muminId);
      setMumin(result);
      setForm(buildForm(result));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function setField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function saveMumin() {
    try {
      setError("");
      setSaving(true);
      const payload = {
        ...mumin,
        ...form,
        age: toNullableNumber(form.age),
        isActive: form.isActive === "true"
      };
      const updated = await mumineenApi.update(muminId, payload);
      setMumin(updated);
      setForm(buildForm(updated));
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    Alert.alert(
      "Delete Mumin",
      `Delete ${mumin?.fullName || mumin?.itsId || "this record"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: deleteMumin
        }
      ]
    );
  }

  async function deleteMumin() {
    try {
      setError("");
      setDeleting(true);
      await mumineenApi.remove(muminId);
      router.back();
    } catch (e) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingView />;

  if (!mumin || !form) {
    return (
      <Screen>
        <Card>
          <Text style={styles.error}>{error || "Mumin record not found."}</Text>
          <Button title="Try again" variant="outline" onPress={loadMumin} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {mumin.fullName || mumin.firstName || "Mumin details"}
          </Text>
          <Text style={styles.subtitle}>
            ITS {mumin.itsId || "-"} · Mumin #{mumin.muminId}
          </Text>
        </View>
        <Button
          title={editing ? "Cancel" : "Edit"}
          variant={editing ? "outline" : "primary"}
          compact
          disabled
          onPress={() => {
            if (editing) setForm(buildForm(mumin));
            setEditing(current => !current);
          }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card>
        <Text style={styles.sectionTitle}>Identity</Text>
        {editing ? (
          <>
            <Input
              label="ITS ID"
              value={form.itsId}
              onChangeText={value => setField("itsId", value)}
              keyboardType="number-pad"
            />
            <Input
              label="Full name"
              value={form.fullName}
              onChangeText={value => setField("fullName", value)}
            />
            <Input
              label="First name"
              value={form.firstName}
              onChangeText={value => setField("firstName", value)}
            />
            <Input
              label="Father name"
              value={form.fatherName}
              onChangeText={value => setField("fatherName", value)}
            />
            <Input
              label="Surname"
              value={form.surname}
              onChangeText={value => setField("surname", value)}
            />
            <Input
              label="HOF/FM type"
              value={form.hofFmType}
              onChangeText={value => setField("hofFmType", value)}
            />
            <Input
              label="HOF ITS ID"
              value={form.hofId}
              onChangeText={value => setField("hofId", value)}
            />
            <Input
              label="Family ID"
              value={form.familyId}
              onChangeText={value => setField("familyId", value)}
            />
          </>
        ) : (
          <>
            <ReadOnlyRow label="Full name" value={mumin.fullName} />
            <ReadOnlyRow label="ITS ID" value={mumin.itsId} />
            <ReadOnlyRow label="HOF/FM type" value={mumin.hofFmType} />
            <ReadOnlyRow label="HOF ITS ID" value={mumin.hofId} />
            <ReadOnlyRow label="Family ID" value={mumin.familyId} />
            <ReadOnlyRow label="Tanzeem file" value={mumin.tanzeemFileNo} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Contact and personal details</Text>
        {editing ? (
          <>
            <Input
              label="Mobile"
              value={form.mobile}
              onChangeText={value => setField("mobile", value)}
              keyboardType="phone-pad"
            />
            <Input
              label="WhatsApp number"
              value={form.whatsAppNo}
              onChangeText={value => setField("whatsAppNo", value)}
              keyboardType="phone-pad"
            />
            <Input
              label="Email"
              value={form.email}
              onChangeText={value => setField("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Age"
              value={form.age}
              onChangeText={value => setField("age", value)}
              keyboardType="number-pad"
            />
            <Select
              label="Gender"
              value={form.gender}
              options={GENDER_OPTIONS}
              onChange={value => setField("gender", value)}
            />
            <Input
              label="Marital status"
              value={form.maritalStatus}
              onChangeText={value => setField("maritalStatus", value)}
            />
            <Input
              label="Blood group"
              value={form.bloodGroup}
              onChangeText={value => setField("bloodGroup", value)}
            />
            <Input
              label="Category"
              value={form.category}
              onChangeText={value => setField("category", value)}
            />
          </>
        ) : (
          <>
            <ReadOnlyRow label="Mobile" value={mumin.mobile} />
            <ReadOnlyRow label="WhatsApp" value={mumin.whatsAppNo} />
            <ReadOnlyRow label="Email" value={mumin.email} />
            <ReadOnlyRow label="Age" value={valueOrEmpty(mumin.age)} />
            <ReadOnlyRow label="Gender" value={mumin.gender} />
            <ReadOnlyRow label="Marital status" value={mumin.maritalStatus} />
            <ReadOnlyRow label="Blood group" value={mumin.bloodGroup} />
            <ReadOnlyRow label="Category" value={mumin.category} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Work and address</Text>
        {editing ? (
          <>
            <Input
              label="Occupation"
              value={form.occupation}
              onChangeText={value => setField("occupation", value)}
            />
            <Input
              label="Qualification"
              value={form.qualification}
              onChangeText={value => setField("qualification", value)}
            />
            <Input
              label="Address"
              value={form.address}
              multiline
              onChangeText={value => setField("address", value)}
            />
            <Input
              label="Building"
              value={form.building}
              onChangeText={value => setField("building", value)}
            />
            <Input
              label="Street"
              value={form.street}
              onChangeText={value => setField("street", value)}
            />
            <Input
              label="Area"
              value={form.area}
              onChangeText={value => setField("area", value)}
            />
            <Input
              label="City"
              value={form.city}
              onChangeText={value => setField("city", value)}
            />
            <Input
              label="State"
              value={form.state}
              onChangeText={value => setField("state", value)}
            />
            <Input
              label="Pincode"
              value={form.pincode}
              onChangeText={value => setField("pincode", value)}
              keyboardType="number-pad"
            />
          </>
        ) : (
          <>
            <ReadOnlyRow label="Occupation" value={mumin.occupation} />
            <ReadOnlyRow label="Qualification" value={mumin.qualification} />
            <ReadOnlyRow label="Address" value={mumin.address} />
            <ReadOnlyRow label="Building" value={mumin.building} />
            <ReadOnlyRow label="Street" value={mumin.street} />
            <ReadOnlyRow label="Area" value={mumin.area} />
            <ReadOnlyRow label="City" value={mumin.city} />
            <ReadOnlyRow label="State" value={mumin.state} />
            <ReadOnlyRow label="Pincode" value={mumin.pincode} />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Jamaat and record status</Text>
        <ReadOnlyRow label="Jamaat" value={mumin.jamaatName || mumin.jamaat} />
        <ReadOnlyRow label="Jamaat ID" value={valueOrEmpty(mumin.jamaatId)} />
        {editing ? (
          <Select
            label="Record status"
            value={form.isActive}
            options={ACTIVE_OPTIONS}
            onChange={value => setField("isActive", value)}
          />
        ) : (
          <ReadOnlyRow
            label="Status"
            value={mumin.isActive ? "Active" : "Inactive"}
          />
        )}
        <ReadOnlyRow
          label="Created at"
          value={mumin.createdAt ? new Date(mumin.createdAt).toLocaleString() : ""}
        />
        <ReadOnlyRow
          label="Updated at"
          value={mumin.updatedAt ? new Date(mumin.updatedAt).toLocaleString() : ""}
        />
      </Card>

      {editing ? (
        <Button
          title="Save Mumin details"
          loading={saving}
          onPress={saveMumin}
        />
      ) : null}

      <Button
        title="Delete Mumin"
        variant="danger"
        loading={deleting}
        disabled
        style={styles.deleteButton}
        onPress={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  headerContent: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    marginTop: 3
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: spacing.md
  },
  readOnlyRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm
  },
  readOnlyLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  readOnlyValue: {
    color: colors.text,
    marginTop: 4,
    lineHeight: 20
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  },
  deleteButton: {
    marginTop: spacing.md
  }
});
