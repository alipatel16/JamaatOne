import React from "react";

import BankAccountsPanel from "../../src/components/BankAccountsPanel";
import Screen from "../../src/components/Screen";
import { canRefundPayments } from "../../src/constants/roles";
import { useAuth } from "../../src/context/AuthContext";

export default function BankAccountsScreen() {
  const { user } = useAuth();
  const canManage = canRefundPayments(user?.role);

  return (
    <Screen>
      <BankAccountsPanel canManage={canManage} />
    </Screen>
  );
}
