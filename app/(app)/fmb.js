import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";

import { apiRequest } from "../../src/api/client";
import { endpoints } from "../../src/api/endpoints";
import Button from "../../src/components/Button";
import Card from "../../src/components/Card";
import Input from "../../src/components/Input";
import Screen from "../../src/components/Screen";
import { canAccessFmb, canManageFmb } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";
import { colors, spacing } from "../../src/theme";

export default function FmbScreen() {
  const { user } = useAuth();
  const manager = canManageFmb(user);

  const [tab, setTab] = useState("my");
  const [profile, setProfile] = useState(null);
  const [members, setMembers] = useState([]);
  const [pauses, setPauses] = useState([]);
  const [fromDate, setFromDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [resumeDate, setResumeDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    try {
      setError("");
      setProfile(await apiRequest(endpoints.myFmbProfile));

      if (manager) {
        const [memberResult, pauseResult] = await Promise.all([
          apiRequest(endpoints.fmbMembers),
          apiRequest(endpoints.fmbPauses),
        ]);
        setMembers(memberResult);
        setPauses(pauseResult);
      }
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  useEffect(() => {
    if (canAccessFmb(user)) loadData();
  }, [manager, user?.role]);

  if (!canAccessFmb(user)) return <Redirect href="/(app)" />;

  async function pauseThali() {
    if (!resumeDate) {
      Alert.alert("Resume date required");
      return;
    }

    try {
      await apiRequest(endpoints.pauseMyThali, {
        method: "POST",
        body: JSON.stringify({ fromDate, resumeDate, reason }),
      });
      setReason("");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function resumeThali() {
    try {
      await apiRequest(endpoints.resumeMyThali, { method: "POST" });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleMembership(member) {
    try {
      await apiRequest(endpoints.fmbMemberById(member.id), {
        method: "PATCH",
        body: JSON.stringify({ takesFmb: !member.takesFmb }),
      });
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <Screen>
      {manager ? (
        <View style={styles.tabs}>
          <Tab id="my" label="My Thali" selected={tab} onSelect={setTab} />
          <Tab id="members" label="Members" selected={tab} onSelect={setTab} />
          <Tab id="pauses" label="Pauses" selected={tab} onSelect={setTab} />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {tab === "my" ? (
        <>
          <Text style={styles.title}>My FMB Thali</Text>
          <Card>
            <Text style={styles.status}>
              {profile?.takesFmb ? "Active FMB member" : "Not enrolled for FMB"}
            </Text>

            {profile?.activePause ? (
              <>
                <Text>Paused from {profile.activePause.fromDate}</Text>
                <Text>Resuming on {profile.activePause.resumeDate}</Text>
                <Text style={styles.pauseReason}>
                  {profile.activePause.reason || "No reason provided"}
                </Text>
                <Button title="Resume now" onPress={resumeThali} />
              </>
            ) : profile?.takesFmb ? (
              <>
                <Input
                  label="Pause from (YYYY-MM-DD)"
                  value={fromDate}
                  onChangeText={setFromDate}
                />
                <Input
                  label="Resume on (YYYY-MM-DD)"
                  value={resumeDate}
                  onChangeText={setResumeDate}
                />
                <Input
                  label="Reason / vacation note"
                  value={reason}
                  onChangeText={setReason}
                />
                <Button title="Pause my thali" onPress={pauseThali} />
              </>
            ) : (
              <Text style={styles.muted}>
                An admin or committee member must enroll you before you can
                pause a thali.
              </Text>
            )}
          </Card>
        </>
      ) : null}

      {tab === "members" ? (
        <>
          <Text style={styles.title}>FMB Membership</Text>
          <Text style={styles.muted}>
            {members.filter((member) => member.takesFmb).length} of{" "}
            {members.length} members currently take FMB.
          </Text>

          {members.map((member) => (
            <Card key={member.id}>
              <View style={styles.row}>
                <View style={styles.memberDetails}>
                  <Text style={styles.name}>{member.name}</Text>
                  <Text style={styles.mutedText}>
                    ITS {member.itsId} ·{" "}
                    {member.relationToHof || "No family link"}
                  </Text>
                  {member.activePause ? (
                    <Text style={styles.pause}>
                      Paused until {member.activePause.resumeDate}
                    </Text>
                  ) : null}
                </View>
                <Button
                  title={member.takesFmb ? "Remove" : "Add"}
                  variant={member.takesFmb ? "danger" : "primary"}
                  onPress={() => toggleMembership(member)}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {tab === "pauses" ? (
        <>
          <Text style={styles.title}>Thali Pause Register</Text>
          {pauses.map((pause) => (
            <Card key={pause.id}>
              <Text style={styles.name}>{pause.userName}</Text>
              <Text>
                {pause.fromDate} → {pause.resumeDate}
              </Text>
              <Text style={styles.pause}>
                {pause.daysPaused} day(s) · {pause.status}
              </Text>
              <Text style={styles.mutedText}>
                {pause.reason || "No reason provided"}
              </Text>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function Tab({ id, label, selected, onSelect }) {
  const active = selected === id;

  return (
    <Pressable
      onPress={() => onSelect(id)}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    padding: 4,
    gap: 4,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
  },
  tab: {
    flex: 1,
    padding: 11,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  tabText: {
    fontWeight: "700",
    color: colors.text,
  },
  tabTextActive: {
    color: colors.primaryStrong,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.text,
    marginBottom: spacing.md,
  },
  status: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.primary,
    marginBottom: spacing.md,
  },
  muted: {
    color: colors.muted,
    marginBottom: spacing.md,
  },
  mutedText: {
    color: colors.muted,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  memberDetails: {
    flex: 1,
    minWidth: 210,
  },
  name: {
    fontWeight: "900",
    fontSize: 16,
    color: colors.text,
  },
  pause: {
    color: colors.danger,
    fontWeight: "700",
    marginTop: 4,
  },
  pauseReason: {
    color: colors.muted,
    marginVertical: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
