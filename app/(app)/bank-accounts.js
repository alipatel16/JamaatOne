import React from "react";
import { Redirect } from "expo-router";

import BankAccountsPanel from "../../src/components/BankAccountsPanel";
import Screen from "../../src/components/Screen";
import { canDeleteJamaatData, canManageAccounts } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";

export default function BankAccountsScreen() {
  const { user } = useAuth();
  const canManage = canManageAccounts(user);
  const canDelete = canDeleteJamaatData(user);

  if (!canManage) return <Redirect href="/(app)/accounts" />;

  return (
    <Screen>
      <BankAccountsPanel canManage={canManage} canDelete={canDelete} />
    </Screen>
  );
}
