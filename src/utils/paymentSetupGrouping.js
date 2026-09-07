function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    sensitivity: "base",
    numeric: true
  });
}

function makeGroup(category) {
  return {
    categoryId: category?.categoryId,
    categoryName: category?.categoryName || "Uncategorized",
    jamaatId: category?.jamaatId,
    jamaatName: category?.jamaatName || "",
    isActive: category?.isActive,
    credit: [],
    debit: [],
    other: []
  };
}

export function buildPaymentSubCategoryGroups(categories = [], subCategories = []) {
  const groupsByCategory = new Map();

  (Array.isArray(categories) ? categories : []).forEach(category => {
    groupsByCategory.set(String(category?.categoryId ?? ""), makeGroup(category));
  });

  (Array.isArray(subCategories) ? subCategories : []).forEach(item => {
    const key = String(item?.categoryId ?? "");
    if (!groupsByCategory.has(key)) {
      groupsByCategory.set(
        key,
        makeGroup({
          categoryId: item?.categoryId,
          categoryName: item?.categoryName,
          jamaatId: item?.jamaatId,
          jamaatName: item?.jamaatName,
          isActive: true
        })
      );
    }

    const group = groupsByCategory.get(key);
    const entryType = String(item?.entryType || "").trim().toUpperCase();
    if (entryType === "CREDIT") group.credit.push(item);
    else if (entryType === "DEBIT") group.debit.push(item);
    else group.other.push(item);
  });

  const sortSubCategories = items =>
    items.sort((a, b) => {
      const nameCompare = compareText(a?.subCategoryName, b?.subCategoryName);
      if (nameCompare !== 0) return nameCompare;
      return Number(a?.subCategoryId || 0) - Number(b?.subCategoryId || 0);
    });

  return Array.from(groupsByCategory.values())
    .map(group => ({
      ...group,
      credit: sortSubCategories(group.credit),
      debit: sortSubCategories(group.debit),
      other: sortSubCategories(group.other)
    }))
    .sort((a, b) => {
      const categoryCompare = compareText(a.categoryName, b.categoryName);
      if (categoryCompare !== 0) return categoryCompare;
      const jamaatCompare = compareText(a.jamaatName, b.jamaatName);
      if (jamaatCompare !== 0) return jamaatCompare;
      return Number(a.categoryId || 0) - Number(b.categoryId || 0);
    });
}
