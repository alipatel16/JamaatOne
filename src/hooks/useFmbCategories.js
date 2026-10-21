import { useEffect, useState } from "react";
import { accountsApi } from "../api/accountsApi";
import { usersApi } from "../api/usersApi";
import { canManageAccounts, isCommitteeMember, isFmbUser } from "../constants/roles";
import { fmbCategoriesForUser } from "../utils/takhmeen";

export default function useFmbCategories(user) {
  const [state, setState] = useState({ categories: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ categories: [], loading: true, error: "" });
    async function load() {
      try {
        if (!canManageAccounts(user) && !isFmbUser(user)) {
          if (active) setState({ categories: [], loading: false, error: "" });
          return;
        }
        const [categories, record] = await Promise.all([
          accountsApi.getPaymentCategories(user.jamaatId),
          isCommitteeMember(user) || isFmbUser(user)
            ? usersApi.getCommitteeMember(user.userId || user.id) : null
        ]);
        if (active) setState({
          categories: fmbCategoriesForUser(user, Array.isArray(categories) ? categories : [], record?.categories || []),
          loading: false, error: ""
        });
      } catch (error) {
        if (active) setState({ categories: [], loading: false, error: error.message || "Unable to check FMB category access." });
      }
    }
    load();
    return () => { active = false; };
  }, [user?.userId, user?.id, user?.role, user?.roleName, user?.jamaatId]);
  return state;
}
