import { useEffect, useState } from "react";
import { accountsApi } from "../api/accountsApi";
import { canManageAccounts } from "../constants/roles";
import { fmbCategoriesForUser } from "../utils/takhmeen";

export default function useFmbCategories(user) {
  const [state, setState] = useState({ categories: [], loading: true, error: "" });
  useEffect(() => {
    let active = true;
    setState({ categories: [], loading: true, error: "" });
    async function load() {
      try {
        if (!canManageAccounts(user)) {
          if (active) setState({ categories: [], loading: false, error: "" });
          return;
        }
        // This API returns the signed-in user's accessible categories. Reading
        // a user-management record is neither needed nor available to every role.
        const categories = await accountsApi.getPaymentCategories(user.jamaatId);
        if (active) setState({
          categories: fmbCategoriesForUser(user, Array.isArray(categories) ? categories : []),
          loading: false, error: ""
        });
      } catch (error) {
        if (active) setState({ categories: [], loading: false, error: error.message || "Unable to check FMB category access." });
      }
    }
    load();
    return () => { active = false; };
  }, [user?.userId, user?.id, user?.role, user?.roleName, user?.roles, user?.jamaatId]);
  return state;
}
