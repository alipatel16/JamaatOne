import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import LoadingView from "../../src/components/LoadingView";
import Screen from "../../src/components/Screen";
import Select from "../../src/components/Select";
import { PAYMENT_TYPES, USER_GRADES, getOptionLabel } from "../../src/constants/accounts";
import { ROLES } from "../../src/constants/roles";
import {
  USER_RELATIONS,
  getRelationLabel
} from "../../src/constants/users";
import { colors, spacing } from "../../src/theme";

const ROLE_OPTIONS = [
  { label: "Normal user", value: ROLES.USER },
  { label: "Committee member", value: ROLES.COMMITTEE_MEMBER },
  { label: "Admin", value: ROLES.ADMIN }
];

const GRADE_OPTIONS = USER_GRADES.map(grade => ({
  label: `Grade ${grade}`,
  value: grade
}));

const FMB_OPTIONS = [
  { label: "Taking FMB thali", value: "YES" },
  { label: "Not taking FMB thali", value: "NO" }
];

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [selectedRelation, setSelectedRelation] = useState("SON");
  const [ledger, setLedger] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function loadAll() {
    try {
      setError("");
      const [userResult, familyResult, candidateResult, ledgerResult] =
        await Promise.all([
          apiRequest(endpoints.userById(userId)),
          apiRequest(endpoints.familyMembers(userId)),
          apiRequest(endpoints.familyCandidates(userId)),
          apiRequest(endpoints.userLedger(userId))
        ]);

      setUser(userResult);
      setForm({
        firstName: userResult.firstName || "",
        middleName: userResult.middleName || "",
        lastName: userResult.lastName || "",
        phoneNumber: userResult.phoneNumber || "",
        email: userResult.email || "",
        dateOfBirth: userResult.dateOfBirth || "",
        address: userResult.address || "",
        role: userResult.role,
        grade: userResult.grade,
        relationToHof: userResult.relationToHof || "HOF",
        takesFmb: userResult.takesFmb ? "YES" : "NO"
      });
      setFamilyMembers(familyResult);
      setCandidates(candidateResult);
      setLedger(ledgerResult);
    } catch (e) {
      setError(e.message);
    }
  }

  const filteredCandidates = useMemo(() => {
    const normalized = candidateSearch.trim().toLowerCase();
    if (!normalized) return candidates;

    return candidates.filter(candidate =>
      [candidate.name, candidate.lastName, candidate.itsId]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(normalized))
    );
  }, [candidateSearch, candidates]);

  async function saveUser() {
    try {
      setError("");
      const updated = await apiRequest(endpoints.updateUser(userId), {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          takesFmb: form.takesFmb === "YES"
        })
      });
      setUser(updated);
      setEditing(false);
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function addFamilyMember() {
    if (!selectedCandidateId) {
      setError("Select a user to add as a family member.");
      return;
    }

    try {
      await apiRequest(endpoints.addFamilyMember(userId), {
        method: "POST",
        body: JSON.stringify({
          memberUserId: selectedCandidateId,
          relationToHof: selectedRelation
        })
      });
      setSelectedCandidateId("");
      setCandidateSearch("");
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function updateRelation(memberId, relationToHof) {
    try {
      await apiRequest(
        endpoints.updateFamilyRelation(userId, memberId),
        {
          method: "PATCH",
          body: JSON.stringify({ relationToHof })
        }
      );
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function removeFamilyMember(memberId) {
    try {
      await apiRequest(
        endpoints.removeFamilyMember(userId, memberId),
        { method: "DELETE" }
      );
      await loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!user || !form) return <LoadingView />;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{user.name}</Text>
          <Text style={styles.subtitle}>ITS ID {user.itsId}</Text>
        </View>
        <Button
          title={editing ? "Cancel" : "Edit"}
          onPress={() => {
            if (editing) {
              setEditing(false);
              loadAll();
            } else {
              setEditing(true);
            }
          }}
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card>
        <Text style={styles.sectionTitle}>User details</Text>

        {editing ? (
          <>
            <Input
              label="First name"
              value={form.firstName}
              onChangeText={firstName =>
                setForm(current => ({ ...current, firstName }))
              }
            />
            <Input
              label="Middle name"
              value={form.middleName}
              onChangeText={middleName =>
                setForm(current => ({ ...current, middleName }))
              }
            />
            <Input
              label="Surname"
              value={form.lastName}
              onChangeText={lastName =>
                setForm(current => ({ ...current, lastName }))
              }
            />
            <Input
              label="Phone number"
              value={form.phoneNumber}
              keyboardType="phone-pad"
              onChangeText={phoneNumber =>
                setForm(current => ({ ...current, phoneNumber }))
              }
            />
            <Input
              label="Email"
              value={form.email}
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={email =>
                setForm(current => ({ ...current, email }))
              }
            />
            <Input
              label="Date of birth"
              value={form.dateOfBirth}
              onChangeText={dateOfBirth =>
                setForm(current => ({ ...current, dateOfBirth }))
              }
            />
            <Input
              label="Address"
              value={form.address}
              multiline
              onChangeText={address =>
                setForm(current => ({ ...current, address }))
              }
            />
            <Select
              label="User role"
              value={form.role}
              options={ROLE_OPTIONS}
              onChange={role =>
                setForm(current => ({ ...current, role }))
              }
            />
            <Select
              label="User grade"
              value={form.grade}
              options={GRADE_OPTIONS}
              onChange={grade =>
                setForm(current => ({ ...current, grade }))
              }
            />
            <Select
              label="Relation with HOF"
              value={form.relationToHof}
              options={USER_RELATIONS}
              onChange={relationToHof =>
                setForm(current => ({ ...current, relationToHof }))
              }
            />
            <Select
              label="FMB thali"
              value={form.takesFmb}
              options={FMB_OPTIONS}
              onChange={takesFmb =>
                setForm(current => ({ ...current, takesFmb }))
              }
            />
            <Button title="Save user details" onPress={saveUser} />
          </>
        ) : (
          <>
            <ReadOnlyRow label="Full name" value={user.name} />
            <ReadOnlyRow label="ITS ID" value={user.itsId} />
            <ReadOnlyRow label="Phone" value={user.phoneNumber} />
            <ReadOnlyRow label="Email" value={user.email} />
            <ReadOnlyRow label="Date of birth" value={user.dateOfBirth} />
            <ReadOnlyRow label="Address" value={user.address} />
            <ReadOnlyRow
              label="Role"
              value={user.role?.replaceAll("_", " ")}
            />
            <ReadOnlyRow label="Grade" value={user.grade} />
            <ReadOnlyRow
              label="Relation with HOF"
              value={getRelationLabel(user.relationToHof)}
            />
            <ReadOnlyRow
              label="FMB thali"
              value={user.takesFmb ? "Taking thali" : "Not taking thali"}
            />
          </>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Customer ledger</Text>
        <Text style={styles.help}>Complete payment history linked to this member profile.</Text>
        <ReadOnlyRow label="Total paid" value={new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(ledger?.totalPaid || 0))} />
        <ReadOnlyRow label="Payment entries" value={String(ledger?.paymentCount || 0)} />
        {(ledger?.entries || []).map(item => (
          <View key={item.id} style={styles.familyMember}>
            <View style={styles.familyIdentity}>
              <Text style={styles.familyName}>{getOptionLabel(PAYMENT_TYPES, item.paymentFor)}</Text>
              <Text style={styles.familyMeta}>{item.paymentDate} · Receipt {item.receiptNumber || "Pending"}</Text>
            </View>
            <Text style={styles.ledgerAmount}>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(item.amount || 0))}</Text>
          </View>
        ))}
        {!ledger?.entries?.length ? <Text style={styles.help}>No payment entries found for this member.</Text> : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Family members</Text>
        <Text style={styles.help}>
          Members linked to the same HOF are shown here. Relations can
          be changed directly from this user detail screen.
        </Text>

        {familyMembers.map(member => (
          <View key={member.id} style={styles.familyMember}>
            <Pressable
              style={styles.familyIdentity}
              onPress={() =>
                router.push({
                  pathname: "/(app)/user-detail",
                  params: { userId: member.id }
                })
              }
            >
              <Text style={styles.familyName}>{member.name}</Text>
              <Text style={styles.familyMeta}>
                ITS {member.itsId} · {member.takesFmb ? "FMB" : "No FMB"}
              </Text>
            </Pressable>

            <View style={styles.familyRelation}>
              <Select
                value={member.relationToHof}
                options={USER_RELATIONS}
                onChange={relation =>
                  updateRelation(member.id, relation)
                }
              />
            </View>

            {member.id !== user.id ? (
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Remove family link?",
                    `${member.name} will become a separate HOF.`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => removeFamilyMember(member.id)
                      }
                    ]
                  )
                }
              >
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
        ))}

        <Text style={styles.subsectionTitle}>Search and add family member</Text>
        <Input
          label="Search existing users"
          value={candidateSearch}
          onChangeText={setCandidateSearch}
          placeholder="Name, surname or ITS ID"
        />

        {filteredCandidates.slice(0, 6).map(candidate => (
          <Pressable
            key={candidate.id}
            onPress={() => setSelectedCandidateId(candidate.id)}
            style={[
              styles.candidate,
              selectedCandidateId === candidate.id &&
                styles.selectedCandidate
            ]}
          >
            <Text style={styles.candidateName}>{candidate.name}</Text>
            <Text style={styles.familyMeta}>ITS {candidate.itsId}</Text>
          </Pressable>
        ))}

        <Select
          label="Relation with HOF"
          value={selectedRelation}
          options={USER_RELATIONS.filter(
            relation => relation.value !== "HOF"
          )}
          onChange={setSelectedRelation}
        />
        <Button title="Add selected family member" onPress={addFamilyMember} />
      </Card>
    </Screen>
  );
}

function ReadOnlyRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg
  },
  back: {
    fontSize: 44,
    color: colors.primary,
    marginRight: spacing.sm
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
  subsectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: spacing.lg,
    marginBottom: spacing.md
  },
  help: {
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.md
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm
  },
  rowLabel: {
    width: 145,
    color: colors.muted,
    fontWeight: "600"
  },
  rowValue: {
    flex: 1,
    color: colors.text,
    fontWeight: "700"
  },
  familyMember: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm
  },
  familyIdentity: {
    marginBottom: spacing.xs
  },
  familyName: {
    color: colors.text,
    fontWeight: "800"
  },
  familyMeta: {
    color: colors.muted,
    marginTop: 3
  },
  familyRelation: {
    maxWidth: 300
  },
  remove: {
    color: colors.danger,
    fontWeight: "700",
    marginBottom: spacing.sm
  },
  candidate: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  selectedCandidate: {
    borderColor: colors.primary,
    backgroundColor: "#EAF2F0"
  },
  candidateName: {
    color: colors.text,
    fontWeight: "800"
  },
  ledgerAmount: { fontWeight: "800", color: colors.primary },
});
