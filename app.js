(function appFactory() {
  "use strict";

  const storageKey = "novasplit-state-v2";
  const accountStoreKey = "novasplit-accounts-v1";
  const sessionKey = "novasplit-session-v1";
  const hashIterations = 120000;
  const palette = ["#45e0bf", "#f7c65a", "#ff6f61", "#a895ff", "#9fc2ff", "#b3ea6b"];

  const defaultState = {
    currency: "INR",
    profileMemberId: "m-ava",
    activeGroupId: "all",
    members: [
      { id: "m-ava", name: "Ava", avatar: "AV", color: "#45e0bf" },
      { id: "m-rio", name: "Rio", avatar: "RI", color: "#f7c65a" },
      { id: "m-zed", name: "Zed", avatar: "ZE", color: "#ff6f61" },
      { id: "m-nia", name: "Nia", avatar: "NI", color: "#a895ff" }
    ],
    groups: [
      { id: "g-orbit", name: "Orbit House", code: "OH", budget: 265000, memberIds: ["m-ava", "m-rio", "m-zed", "m-nia"] },
      { id: "g-kyoto", name: "Kyoto Sprint", code: "KS", budget: 448000, memberIds: ["m-ava", "m-rio", "m-nia"] },
      { id: "g-lab", name: "Design Lab", code: "DL", budget: 149000, memberIds: ["m-ava", "m-zed"] }
    ],
    expenses: [
      {
        id: "e-1",
        title: "Launch dinner",
        amount: 23800,
        currency: "INR",
        category: "food",
        groupId: "g-orbit",
        payerId: "m-ava",
        paidAt: "2026-04-22",
        participants: ["m-ava", "m-rio", "m-zed", "m-nia"],
        split: { type: "equal" },
        note: "Shared welcome dinner."
      },
      {
        id: "e-2",
        title: "Capsule hotel block",
        amount: 98000,
        currency: "INR",
        category: "stay",
        groupId: "g-kyoto",
        payerId: "m-rio",
        paidAt: "2026-04-20",
        participants: ["m-ava", "m-rio", "m-nia"],
        split: { type: "custom", values: { "m-ava": 35000, "m-rio": 28000, "m-nia": 35000 } },
        note: "Nia and Ava took the larger pods."
      },
      {
        id: "e-3",
        title: "Prototype materials",
        amount: 53200,
        currency: "INR",
        category: "work",
        groupId: "g-lab",
        payerId: "m-zed",
        paidAt: "2026-04-18",
        participants: ["m-ava", "m-zed"],
        split: { type: "equal" },
        note: "Sensor kit and printed shells."
      },
      {
        id: "e-4",
        title: "Airport transfer",
        amount: 13950,
        currency: "INR",
        category: "travel",
        groupId: "g-kyoto",
        payerId: "m-ava",
        paidAt: "2026-04-21",
        participants: ["m-ava", "m-rio", "m-nia"],
        split: { type: "equal" },
        note: ""
      },
      {
        id: "e-5",
        title: "Smart pantry",
        amount: 17850,
        currency: "INR",
        category: "home",
        groupId: "g-orbit",
        payerId: "m-nia",
        paidAt: "2026-04-23",
        participants: ["m-ava", "m-rio", "m-zed", "m-nia"],
        split: { type: "equal" },
        note: "Groceries and filter cartridges."
      }
    ]
  };

  let accountStore = loadAccountStore();
  let currentUser = loadSessionUser();
  let state = currentUser ? loadUserState(currentUser.id) : loadState();
  let animationFrame = 0;
  let canvasPhase = 0;

  const elements = {};

  document.addEventListener("DOMContentLoaded", () => {
    init();
  });

  function init() {
    [
      "accountCard",
      "activeScopeLabel",
      "applySettlementButton",
      "authGate",
      "authMessage",
      "activeGroupMemberList",
      "balanceCanvas",
      "budgetList",
      "cancelEditButton",
      "categoryBars",
      "categoryFilter",
      "countMetric",
      "csvButton",
      "currencySelect",
      "customSplits",
      "expenseForm",
      "expenseGroupSelect",
      "expenseList",
      "expenseMessage",
      "expenseSubmitLabel",
      "exportButton",
      "focusExpenseButton",
      "focusMemberButton",
      "groupSettingsForm",
      "groupForm",
      "groupList",
      "groupMemberList",
      "importButton",
      "importFileInput",
      "insightGrid",
      "memberForm",
      "monthFilter",
      "netMetric",
      "oweMetric",
      "owedMetric",
      "participantList",
      "payerSelect",
      "personList",
      "postRecurringButton",
      "recurringList",
      "resetButton",
      "searchInput",
      "settlementList",
      "shareSettlementButton",
      "signInForm",
      "signUpForm",
      "sortSelect",
      "statusFilter"
    ].forEach((id) => {
      elements[id] = document.getElementById(id);
    });

    bindEvents();
    render();
    startCanvasLoop();
  }

  function bindEvents() {
    elements.expenseForm.addEventListener("submit", handleExpenseSubmit);
    elements.memberForm.addEventListener("submit", handleMemberSubmit);
    elements.groupForm.addEventListener("submit", handleGroupSubmit);
    elements.groupSettingsForm.addEventListener("submit", handleGroupSettingsSubmit);
    elements.signInForm.addEventListener("submit", handleSignIn);
    elements.signUpForm.addEventListener("submit", handleSignUp);
    document.querySelectorAll('input[name="authMode"]').forEach((input) => {
      input.addEventListener("change", syncAuthMode);
    });
    elements.expenseGroupSelect.addEventListener("change", syncGroupMemberControls);
    elements.currencySelect.addEventListener("change", (event) => {
      state.currency = event.target.value;
      saveState();
      render();
    });
    elements.searchInput.addEventListener("input", renderExpenses);
    elements.categoryFilter.addEventListener("change", renderExpenses);
    elements.statusFilter.addEventListener("change", renderExpenses);
    elements.monthFilter.addEventListener("change", renderExpenses);
    elements.sortSelect.addEventListener("change", renderExpenses);
    elements.exportButton.addEventListener("click", exportState);
    elements.csvButton.addEventListener("click", exportCsv);
    elements.importButton.addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", importState);
    elements.resetButton.addEventListener("click", resetDemo);
    elements.applySettlementButton.addEventListener("click", applyNextSettlement);
    elements.shareSettlementButton.addEventListener("click", shareSettlements);
    elements.postRecurringButton.addEventListener("click", postDueRecurring);
    elements.cancelEditButton.addEventListener("click", cancelExpenseEdit);
    elements.focusExpenseButton.addEventListener("click", () => focusFirstField(elements.expenseForm));
    elements.focusMemberButton.addEventListener("click", () => focusFirstField(elements.memberForm));

    elements.expenseForm.addEventListener("change", (event) => {
      if (event.target.name === "splitType" || event.target.name === "participants") {
        syncCustomSplitControls();
      }
    });

    elements.expenseForm.elements.namedItem("amount").addEventListener("input", syncCustomSplitControls);

    window.addEventListener("resize", () => {
      window.cancelAnimationFrame(animationFrame);
      startCanvasLoop();
    });
  }

  function loadAccountStore() {
    try {
      const saved = localStorage.getItem(accountStoreKey);
      if (!saved) {
        return { version: 1, users: [], ledgers: {} };
      }
      const parsed = JSON.parse(saved);
      return {
        version: 1,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        ledgers: parsed.ledgers && typeof parsed.ledgers === "object" ? parsed.ledgers : {}
      };
    } catch (error) {
      console.warn("Unable to load account store", error);
      return { version: 1, users: [], ledgers: {} };
    }
  }

  function saveAccountStore() {
    localStorage.setItem(accountStoreKey, JSON.stringify(accountStore));
  }

  function loadSessionUser() {
    const userId = localStorage.getItem(sessionKey);
    const user = accountStore.users.find((item) => item.id === userId);
    return user ? publicUser(user) : null;
  }

  function loadUserState(userId) {
    const saved = accountStore.ledgers[userId];
    if (!saved) {
      return loadState();
    }
    return normalizeRupeeState({ ...structuredClone(defaultState), ...structuredClone(saved) });
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        return normalizeRupeeState(structuredClone(defaultState));
      }
      return normalizeRupeeState({ ...structuredClone(defaultState), ...JSON.parse(saved) });
    } catch (error) {
      console.warn("Unable to load saved state", error);
      return normalizeRupeeState(structuredClone(defaultState));
    }
  }

  function normalizeRupeeState(nextState) {
    nextState.currency = "INR";
    nextState.members = Array.isArray(nextState.members) ? nextState.members : [];
    nextState.groups = Array.isArray(nextState.groups) ? nextState.groups : [];
    nextState.expenses = (nextState.expenses || []).map((expense) => ({
      status: "cleared",
      paymentMethod: "upi",
      merchant: "",
      tags: [],
      receipt: null,
      recurring: { interval: "none", nextDate: "" },
      ...expense,
      currency: "INR",
      tags: normalizeTags(expense.tags),
      recurring: normalizeRecurring(expense)
    }));
    return nextState;
  }

  function normalizeRecurring(expense) {
    const recurring = expense.recurring || {};
    const interval = recurring.interval || "none";
    return {
      interval,
      nextDate: recurring.nextDate || (interval !== "none" ? nextRecurringDate(expense.paidAt, interval) : "")
    };
  }

  function saveState() {
    state = normalizeRupeeState(state);
    if (currentUser) {
      accountStore.ledgers[currentUser.id] = structuredClone(state);
      saveAccountStore();
      renderSaveStatus();
      return;
    }
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function render() {
    renderAuthState();
    renderAccount();
    elements.currencySelect.value = state.currency;
    renderGroups();
    renderSelectors();
    syncGroupMemberControls();
    renderFilters();
    renderMetrics();
    renderExpenses();
    renderSettlements();
    renderPeople();
    renderCategoryBars();
    renderBudgetList();
    renderRecurringList();
    renderInsights();
    renderGroupSettings();
    refreshIcons();
  }

  function renderAuthState() {
    document.body.classList.toggle("signed-out", !currentUser);
    elements.authGate.hidden = Boolean(currentUser);
    syncAuthMode();
  }

  function renderAccount() {
    if (!currentUser) {
      elements.accountCard.innerHTML = `
        <div class="section-kicker">Account</div>
        <div class="account-card">
          <button class="secondary-button full-width" type="button" data-open-auth>
            <i data-lucide="log-in"></i>
            <span>Sign in</span>
          </button>
        </div>
      `;
      elements.accountCard.querySelector("[data-open-auth]")?.addEventListener("click", () => {
        elements.authGate.hidden = false;
        elements.signInForm.elements.namedItem("email").focus();
      });
      return;
    }

    elements.accountCard.innerHTML = `
      <div class="section-kicker">Account</div>
      <div class="account-card">
        <div class="account-row">
          <span class="avatar" style="--avatar-color: ${escapeHtml(currentUser.color || "#45e0bf")}">${escapeHtml(currentUser.avatar || initials(currentUser.name))}</span>
          <span>
            <strong>${escapeHtml(currentUser.name)}</strong>
            <small>${escapeHtml(currentUser.email)}</small>
          </span>
        </div>
        <div class="account-actions">
          <button class="ghost-button" type="button" data-save-now>
            <i data-lucide="save"></i>
            <span id="saveStatus">Saved</span>
          </button>
          <button class="icon-button" type="button" title="Sign out" data-sign-out>
            <i data-lucide="log-out"></i>
          </button>
        </div>
      </div>
    `;
    elements.accountCard.querySelector("[data-save-now]")?.addEventListener("click", () => {
      saveState();
      setSaveStatus("Saved now");
    });
    elements.accountCard.querySelector("[data-sign-out]")?.addEventListener("click", handleSignOut);
  }

  function renderSaveStatus() {
    setSaveStatus("Saved");
  }

  function setSaveStatus(message) {
    const saveStatus = document.getElementById("saveStatus");
    if (saveStatus) {
      saveStatus.textContent = message;
    }
  }

  function syncAuthMode() {
    const mode = document.querySelector('input[name="authMode"]:checked')?.value || "signin";
    elements.signInForm.hidden = mode !== "signin";
    elements.signUpForm.hidden = mode !== "signup";
    document.getElementById("authTitle").textContent = mode === "signin" ? "Sign in to continue" : "Create account";
    elements.authMessage.textContent = "";
  }

  function renderGroups() {
    const expenses = getScopedExpenses("all");
    const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const groups = [
      {
        id: "all",
        name: "All groups",
        code: "ALL",
        detail: `${expenses.length} expenses`,
        amount: totalAmount
      },
      ...state.groups.map((group) => {
        const groupExpenses = getScopedExpenses(group.id);
        return {
          ...group,
          detail: `${group.memberIds.length} people`,
          amount: groupExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
        };
      })
    ];

    elements.groupList.innerHTML = groups
      .map((group) => {
        const active = state.activeGroupId === group.id ? " active" : "";
        return `
          <button class="group-button${active}" type="button" data-group-id="${escapeHtml(group.id)}">
            <span class="group-chip">${escapeHtml(group.code || initials(group.name))}</span>
            <span>
              <strong>${escapeHtml(group.name)}</strong>
              <small>${escapeHtml(group.detail)}</small>
            </span>
            <span class="count-badge">${formatMoney(group.amount)}</span>
          </button>
        `;
      })
      .join("");

    elements.groupList.querySelectorAll("[data-group-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.activeGroupId = button.dataset.groupId;
        saveState();
        render();
      });
    });
  }

  function renderSelectors() {
    elements.expenseGroupSelect.innerHTML = state.groups
      .map((group) => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.name)}</option>`)
      .join("");

    const preferredGroup = state.activeGroupId === "all" ? state.groups[0]?.id : state.activeGroupId;
    if (preferredGroup) {
      elements.expenseGroupSelect.value = preferredGroup;
    }

    elements.payerSelect.innerHTML = state.members
      .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
      .join("");

    if (!elements.expenseForm.elements.namedItem("paidAt").value) {
      elements.expenseForm.elements.namedItem("paidAt").value = todayIso();
    }

    renderGroupMemberList();
  }

  function syncGroupMemberControls() {
    const groupId = elements.expenseGroupSelect.value || state.groups[0]?.id;
    const group = state.groups.find((item) => item.id === groupId);
    const memberIds = group ? group.memberIds : state.members.map((member) => member.id);
    const members = state.members.filter((member) => memberIds.includes(member.id));

    elements.participantList.innerHTML = members
      .map((member) => {
        return `
          <label class="check-pill">
            <input type="checkbox" name="participants" value="${escapeHtml(member.id)}" checked>
            <span>${escapeHtml(member.name)}</span>
          </label>
        `;
      })
      .join("");

    const firstMemberId = members[0]?.id || state.members[0]?.id;
    if (firstMemberId) {
      elements.payerSelect.value = firstMemberId;
    }
    syncCustomSplitControls();
  }

  function renderGroupMemberList() {
    elements.groupMemberList.innerHTML = state.members
      .map((member) => {
        return `
          <label class="check-pill">
            <input type="checkbox" name="groupMembers" value="${escapeHtml(member.id)}" checked>
            <span>${escapeHtml(member.name)}</span>
          </label>
        `;
      })
      .join("");
  }

  function syncCustomSplitControls() {
    const splitType = getFormValue(elements.expenseForm, "splitType");
    const participantIds = checkedValues(elements.expenseForm, "participants");
    const amount = Number(elements.expenseForm.elements.namedItem("amount").value || 0);
    const isAdvanced = ["custom", "percent", "shares"].includes(splitType);

    elements.customSplits.hidden = !isAdvanced;
    if (!isAdvanced) {
      elements.customSplits.innerHTML = "";
      return;
    }

    const existingValues = new FormData(elements.expenseForm);
    const equalAmount = participantIds.length ? Ledger.roundMoney(amount / participantIds.length) : 0;
    const equalPercent = participantIds.length ? Ledger.roundMoney(100 / participantIds.length) : 0;
    elements.customSplits.innerHTML = participantIds
      .map((memberId) => {
        const member = memberById(memberId);
        const fallback = splitType === "percent" ? equalPercent : splitType === "shares" ? 1 : equalAmount;
        const label = splitType === "percent" ? "%" : splitType === "shares" ? "shares" : "Rs";
        const current = existingValues.get(`custom-${memberId}`) || fallback || "";
        return `
          <label class="custom-split-row">
            <span>${escapeHtml(member?.name || "Unknown")} <small>${escapeHtml(label)}</small></span>
            <input name="custom-${escapeHtml(memberId)}" inputmode="decimal" type="number" min="0" step="0.01" value="${escapeHtml(current)}">
          </label>
        `;
      })
      .join("");
  }

  function renderMetrics() {
    const profileId = state.profileMemberId;
    const balances = Ledger.calculateBalances(state, state.activeGroupId);
    const profileBalance = balances.find((balance) => balance.memberId === profileId) || { net: 0 };
    const scopedExpenses = getScopedExpenses(state.activeGroupId);
    const totalFlow = balances.reduce((sum, balance) => sum + Math.abs(balance.net), 0) / 2;

    elements.owedMetric.textContent = formatMoney(Math.max(profileBalance.net, 0));
    elements.oweMetric.textContent = formatMoney(Math.max(-profileBalance.net, 0));
    elements.netMetric.textContent = formatMoney(totalFlow);
    elements.countMetric.textContent = String(scopedExpenses.length);
    elements.activeScopeLabel.textContent = activeGroupName();
  }

  function renderFilters() {
    const currentCategory = elements.categoryFilter.value || "all";
    const currentMonth = elements.monthFilter.value || "all";
    const standardCategories = ["food", "stay", "travel", "home", "work", "fun", "health", "shopping", "settlement"];
    const categories = Array.from(new Set([...standardCategories, ...state.expenses.map((expense) => expense.category || "other")]));
    elements.categoryFilter.innerHTML = [
      `<option value="all">All categories</option>`,
      ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(titleCase(category))}</option>`)
    ].join("");
    elements.categoryFilter.value = categories.includes(currentCategory) ? currentCategory : "all";

    const months = Array.from(new Set(state.expenses.map((expense) => monthKey(expense.paidAt)).filter(Boolean))).sort().reverse();
    elements.monthFilter.innerHTML = [
      `<option value="all">All months</option>`,
      ...months.map((month) => `<option value="${escapeHtml(month)}">${escapeHtml(formatMonth(month))}</option>`)
    ].join("");
    elements.monthFilter.value = months.includes(currentMonth) ? currentMonth : "all";
  }

  function renderExpenses() {
    const query = elements.searchInput.value.trim().toLowerCase();
    const category = elements.categoryFilter.value;
    const status = elements.statusFilter.value;
    const month = elements.monthFilter.value;
    const sort = elements.sortSelect.value;
    const expenses = getScopedExpenses(state.activeGroupId)
      .filter((expense) => {
        const haystack = [
          expense.title,
          expense.category,
          expense.note,
          expense.merchant,
          (expense.tags || []).join(" "),
          memberById(expense.payerId)?.name
        ]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const matchesCategory = category === "all" || expense.category === category;
        const matchesStatus = status === "all" || (expense.status || "cleared") === status;
        const matchesMonth = month === "all" || monthKey(expense.paidAt) === month;
        return matchesQuery && matchesCategory && matchesStatus && matchesMonth;
      })
      .sort((a, b) => sortExpenses(a, b, sort));

    if (!expenses.length) {
      elements.expenseList.innerHTML = `<div class="empty-state">No expenses match this view.</div>`;
      return;
    }

    elements.expenseList.innerHTML = expenses
      .map((expense) => {
        const payer = memberById(expense.payerId);
        const group = groupById(expense.groupId);
        const receipt = expense.receipt ? `<a class="receipt-link" href="${escapeHtml(expense.receipt.dataUrl)}" target="_blank" rel="noreferrer">Receipt</a>` : "";
        const tags = (expense.tags || []).map((tag) => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join("");
        return `
          <article class="expense-card">
            <div class="expense-main">
              <div class="expense-title-row">
                <strong>${escapeHtml(expense.title)}</strong>
                <span class="category-tag">${escapeHtml(expense.category)}</span>
                <span class="status-tag ${escapeHtml(expense.status || "cleared")}">${escapeHtml(titleCase(expense.status || "cleared"))}</span>
              </div>
              <div class="expense-meta">
                Paid by ${escapeHtml(payer?.name || "Unknown")} in ${escapeHtml(group?.name || "Group")}
                on ${escapeHtml(formatDate(expense.paidAt))}. Split ${escapeHtml(expense.split?.type || "equal")}.
                ${expense.merchant ? `Merchant: ${escapeHtml(expense.merchant)}.` : ""}
                ${expense.paymentMethod ? `Via ${escapeHtml(titleCase(expense.paymentMethod))}.` : ""}
              </div>
              ${expense.note ? `<p class="expense-note">${escapeHtml(expense.note)}</p>` : ""}
              ${tags ? `<div class="tag-list">${tags}</div>` : ""}
            </div>
            <div class="expense-amount">
              <strong>${formatMoney(expense.amount, expense.currency)}</strong>
              ${receipt}
              <div class="expense-actions">
                <button class="delete-button" type="button" data-edit-expense="${escapeHtml(expense.id)}">Edit</button>
                <button class="delete-button" type="button" data-duplicate-expense="${escapeHtml(expense.id)}">Copy</button>
                <button class="delete-button" type="button" data-delete-expense="${escapeHtml(expense.id)}">Delete</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");

    elements.expenseList.querySelectorAll("[data-delete-expense]").forEach((button) => {
      button.addEventListener("click", () => {
        state.expenses = state.expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
        saveState();
        render();
      });
    });
    elements.expenseList.querySelectorAll("[data-edit-expense]").forEach((button) => {
      button.addEventListener("click", () => startExpenseEdit(button.dataset.editExpense));
    });
    elements.expenseList.querySelectorAll("[data-duplicate-expense]").forEach((button) => {
      button.addEventListener("click", () => duplicateExpense(button.dataset.duplicateExpense));
    });
  }

  function renderSettlements() {
    const settlements = currentSettlements();
    elements.applySettlementButton.disabled = settlements.length === 0;

    if (!settlements.length) {
      elements.settlementList.innerHTML = `<div class="empty-state">Everyone is square in this scope.</div>`;
      return;
    }

    elements.settlementList.innerHTML = settlements
      .map((settlement) => {
        const from = memberById(settlement.fromId);
        return `
          <div class="settlement-row">
            <span class="avatar" style="--avatar-color: ${escapeHtml(from?.color || "#45e0bf")}">${escapeHtml(from?.avatar || "??")}</span>
            <span>
              <strong>${escapeHtml(settlement.fromName)} pays ${escapeHtml(settlement.toName)}</strong>
              <small>Optimized transfer</small>
            </span>
            <strong>${formatMoney(settlement.amount)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderPeople() {
    const balances = Ledger.calculateBalances(state, state.activeGroupId);
    elements.personList.innerHTML = balances
      .map((balance) => {
        const className = balance.net > 0.009 ? "positive-text" : balance.net < -0.009 ? "negative-text" : "neutral-text";
        const label = balance.net > 0.009 ? "is owed" : balance.net < -0.009 ? "owes" : "settled";
        return `
          <div class="person-row">
            <span class="avatar" style="--avatar-color: ${escapeHtml(balance.color || "#45e0bf")}">${escapeHtml(balance.avatar || initials(balance.name))}</span>
            <span>
              <strong>${escapeHtml(balance.name)}</strong>
              <small>${escapeHtml(label)}</small>
            </span>
            <strong class="${className}">${formatMoney(Math.abs(balance.net))}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderCategoryBars() {
    const totals = Ledger.categoryTotals(state, state.activeGroupId);
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(([, value]) => value), 1);

    if (!entries.length) {
      elements.categoryBars.innerHTML = `<div class="empty-state">Add expenses to see category signals.</div>`;
      return;
    }

    elements.categoryBars.innerHTML = entries
      .map(([category, value]) => {
        const width = Math.max(3, (value / max) * 100);
        return `
          <div class="bar-row">
            <span>${escapeHtml(titleCase(category))}</span>
            <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
            <strong>${formatMoney(value)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderBudgetList() {
    if (!state.groups.length) {
      elements.budgetList.innerHTML = `<div class="empty-state">Create a group to track budgets.</div>`;
      return;
    }

    elements.budgetList.innerHTML = state.groups
      .map((group) => {
        const spent = getScopedExpenses(group.id).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const budget = Number(group.budget || 0);
        const percent = budget > 0 ? Math.min(160, spent / budget * 100) : 0;
        const remaining = Math.max(0, budget - spent);
        const alert = budget > 0 && spent > budget ? "over" : budget > 0 && percent > 80 ? "watch" : "ok";
        return `
          <div class="budget-row ${alert}">
            <div>
              <strong>${escapeHtml(group.name)}</strong>
              <small>${budget > 0 ? `${formatMoney(remaining)} left` : "No budget set"}</small>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width: ${Math.min(percent, 100)}%"></div></div>
            <strong>${formatMoney(spent)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderRecurringList() {
    const recurring = state.expenses
      .filter((expense) => expense.recurring && expense.recurring.interval !== "none")
      .sort((a, b) => new Date(a.recurring.nextDate || a.paidAt) - new Date(b.recurring.nextDate || b.paidAt));

    if (!recurring.length) {
      elements.recurringList.innerHTML = `<div class="empty-state">Set an expense to repeat and it will appear here.</div>`;
      elements.postRecurringButton.disabled = true;
      return;
    }

    const today = todayIso();
    elements.postRecurringButton.disabled = !recurring.some((expense) => expense.recurring.nextDate <= today);
    elements.recurringList.innerHTML = recurring
      .map((expense) => {
        const due = expense.recurring.nextDate <= today ? "Due now" : formatDate(expense.recurring.nextDate);
        return `
          <div class="mini-row">
            <span class="metric-icon neutral"><i data-lucide="repeat-2"></i></span>
            <span>
              <strong>${escapeHtml(expense.title)}</strong>
              <small>${escapeHtml(titleCase(expense.recurring.interval))} - ${escapeHtml(due)}</small>
            </span>
            <strong>${formatMoney(expense.amount)}</strong>
          </div>
        `;
      })
      .join("");
  }

  function renderInsights() {
    const scopedExpenses = getScopedExpenses(state.activeGroupId);
    const total = scopedExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const largest = scopedExpenses.reduce((winner, expense) => {
      return !winner || Number(expense.amount || 0) > Number(winner.amount || 0) ? expense : winner;
    }, null);
    const payerTotals = {};
    scopedExpenses.forEach((expense) => {
      payerTotals[expense.payerId] = (payerTotals[expense.payerId] || 0) + Number(expense.amount || 0);
    });
    const topPayerId = Object.entries(payerTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    const pending = scopedExpenses.filter((expense) => (expense.status || "cleared") !== "cleared");
    const avg = scopedExpenses.length ? total / scopedExpenses.length : 0;

    const insights = [
      { label: "Average", value: formatMoney(avg), icon: "gauge" },
      { label: "Largest", value: largest ? formatMoney(largest.amount) : "Rs 0", icon: "trending-up", sub: largest?.title },
      { label: "Top payer", value: topPayerId ? memberById(topPayerId)?.name || "Unknown" : "None", icon: "crown" },
      { label: "Open items", value: String(pending.length), icon: "alarm-clock" }
    ];

    elements.insightGrid.innerHTML = insights
      .map((insight) => {
        return `
          <div class="insight-card">
            <span class="metric-icon warm"><i data-lucide="${escapeHtml(insight.icon)}"></i></span>
            <span>${escapeHtml(insight.label)}</span>
            <strong>${escapeHtml(insight.value)}</strong>
            ${insight.sub ? `<small>${escapeHtml(insight.sub)}</small>` : ""}
          </div>
        `;
      })
      .join("");
  }

  function renderGroupSettings() {
    const group = state.activeGroupId === "all" ? state.groups[0] : groupById(state.activeGroupId);
    const form = elements.groupSettingsForm;
    if (!group) {
      form.elements.namedItem("name").value = "";
      form.elements.namedItem("budget").value = "";
      elements.activeGroupMemberList.innerHTML = `<div class="empty-state">Create a group first.</div>`;
      return;
    }

    const nameInput = form.elements.namedItem("name");
    const budgetInput = form.elements.namedItem("budget");
    if (document.activeElement !== nameInput && document.activeElement !== budgetInput) {
      form.elements.namedItem("name").value = group.name;
      form.elements.namedItem("budget").value = group.budget || "";
    }

    elements.activeGroupMemberList.innerHTML = state.members
      .map((member) => {
        const checked = group.memberIds.includes(member.id) ? " checked" : "";
        return `
          <label class="check-pill">
            <input type="checkbox" name="activeGroupMembers" value="${escapeHtml(member.id)}"${checked}>
            <span>${escapeHtml(member.name)}</span>
          </label>
        `;
      })
      .join("");
  }

  async function handleSignUp(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const email = normalizeEmail(data.get("email"));
    const password = String(data.get("password") || "");

    if (!name || !email || password.length < 6) {
      setAuthMessage("Use a name, email, and password with at least 6 characters.");
      return;
    }

    if (findUserByEmail(email)) {
      setAuthMessage("That email already has an account.");
      return;
    }

    setAuthMessage("Creating account...");
    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const user = {
      id: createId("u"),
      name,
      email,
      avatar: initials(name),
      color: palette[accountStore.users.length % palette.length],
      salt,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    accountStore.users.push(user);
    currentUser = publicUser(user);
    state = hasLegacyState() ? personalizeState(state, currentUser) : createStarterState(currentUser);
    accountStore.ledgers[user.id] = structuredClone(state);
    localStorage.setItem(sessionKey, user.id);
    saveAccountStore();
    form.reset();
    elements.authMessage.textContent = "";
    render();
  }

  async function handleSignIn(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = normalizeEmail(data.get("email"));
    const password = String(data.get("password") || "");
    const user = findUserByEmail(email);

    if (!user) {
      setAuthMessage("No account found for that email.");
      return;
    }

    setAuthMessage("Checking account...");
    const passwordHash = await hashPassword(password, user.salt);
    if (passwordHash !== user.passwordHash) {
      setAuthMessage("Password did not match.");
      return;
    }

    currentUser = publicUser(user);
    state = loadUserState(user.id);
    localStorage.setItem(sessionKey, user.id);
    form.reset();
    elements.authMessage.textContent = "";
    render();
  }

  function handleSignOut() {
    saveState();
    localStorage.removeItem(sessionKey);
    currentUser = null;
    state = loadState();
    render();
  }

  async function handleExpenseSubmit(event) {
    event.preventDefault();
    if (!requireAccount()) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const editingExpenseId = String(data.get("editingExpenseId") || "");
    const amount = Ledger.roundMoney(data.get("amount"));
    const participants = checkedValues(form, "participants");
    const splitType = data.get("splitType");

    if (!participants.length) {
      setMessage("Choose at least one person to split with.");
      return;
    }

    if (amount <= 0) {
      setMessage("Enter an amount greater than zero.");
      return;
    }

    let split = { type: "equal" };
    if (["custom", "percent", "shares"].includes(splitType)) {
      const values = {};
      let customTotal = 0;
      participants.forEach((memberId) => {
        const value = Ledger.roundMoney(data.get(`custom-${memberId}`) || 0);
        values[memberId] = value;
        customTotal = Ledger.roundMoney(customTotal + value);
      });
      if (splitType === "custom" && Math.abs(customTotal - amount) > 0.009) {
        setMessage(`Custom split must equal ${formatMoney(amount)}. Current total is ${formatMoney(customTotal)}.`);
        return;
      }
      if (splitType === "percent" && Math.abs(customTotal - 100) > 0.009) {
        setMessage(`Percent split must equal 100%. Current total is ${customTotal}%.`);
        return;
      }
      if (splitType === "shares" && customTotal <= 0) {
        setMessage("Share split needs at least one share.");
        return;
      }
      split = { type: splitType, values };
    }

    const existingExpense = editingExpenseId ? state.expenses.find((expense) => expense.id === editingExpenseId) : null;
    const receiptFile = form.elements.namedItem("receipt").files[0];
    const receipt = receiptFile ? await readReceipt(receiptFile) : existingExpense?.receipt || null;
    const interval = data.get("recurringInterval") || "none";
    const paidAt = data.get("paidAt") || todayIso();
    const expense = {
      id: editingExpenseId || createId("e"),
      title: String(data.get("title") || "").trim(),
      amount,
      currency: "INR",
      category: data.get("category"),
      groupId: data.get("groupId"),
      payerId: data.get("payerId"),
      paidAt,
      merchant: String(data.get("merchant") || "").trim(),
      paymentMethod: data.get("paymentMethod") || "upi",
      status: data.get("status") || "cleared",
      tags: normalizeTags(data.get("tags")),
      participants,
      split,
      note: String(data.get("note") || "").trim(),
      receipt,
      recurring: {
        interval,
        nextDate: interval === "none" ? "" : existingExpense?.recurring?.nextDate || nextRecurringDate(paidAt, interval)
      }
    };

    if (editingExpenseId) {
      state.expenses = state.expenses.map((item) => (item.id === editingExpenseId ? expense : item));
    } else {
      state.expenses.push(expense);
    }

    form.reset();
    cancelExpenseEdit(false);
    elements.currencySelect.value = "INR";
    saveState();
    syncGroupMemberControls();
    setMessage(editingExpenseId ? "Expense updated." : "Expense saved.");
    render();
  }

  function handleMemberSubmit(event) {
    event.preventDefault();
    if (!requireAccount()) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      return;
    }

    const member = {
      id: createId("m"),
      name,
      avatar: initials(name),
      color: palette[state.members.length % palette.length]
    };
    state.members.push(member);
    const activeGroup = state.groups.find((group) => group.id === state.activeGroupId) || state.groups[0];
    if (activeGroup && !activeGroup.memberIds.includes(member.id)) {
      activeGroup.memberIds.push(member.id);
    }
    form.reset();
    saveState();
    render();
  }

  function handleGroupSubmit(event) {
    event.preventDefault();
    if (!requireAccount()) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const memberIds = checkedValues(form, "groupMembers");

    if (!name || !memberIds.length) {
      return;
    }

    const group = {
      id: createId("g"),
      name,
      code: initials(name),
      budget: Number(data.get("budget") || 0),
      memberIds
    };
    state.groups.push(group);
    state.activeGroupId = group.id;
    form.reset();
    saveState();
    render();
  }

  function handleGroupSettingsSubmit(event) {
    event.preventDefault();
    if (!requireAccount()) {
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(form);
    const group = state.activeGroupId === "all" ? state.groups[0] : groupById(state.activeGroupId);
    const memberIds = checkedValues(form, "activeGroupMembers");
    if (!group || !String(data.get("name") || "").trim() || !memberIds.length) {
      return;
    }

    group.name = String(data.get("name") || "").trim();
    group.code = initials(group.name);
    group.budget = Number(data.get("budget") || 0);
    group.memberIds = memberIds;
    saveState();
    render();
  }

  function applyNextSettlement() {
    if (!requireAccount()) {
      return;
    }
    const [settlement] = currentSettlements();
    if (!settlement) {
      return;
    }
    const groupId = state.activeGroupId === "all" ? state.groups[0]?.id : state.activeGroupId;
    if (!groupId) {
      return;
    }
    state.expenses.push({
      id: createId("e"),
      title: `Settlement to ${settlement.toName}`,
      amount: settlement.amount,
      currency: "INR",
      category: "settlement",
      groupId,
      payerId: settlement.fromId,
      paidAt: new Date().toISOString().slice(0, 10),
      participants: [settlement.toId],
      split: { type: "custom", values: { [settlement.toId]: settlement.amount } },
      note: "Applied from optimized settlement."
    });
    saveState();
    render();
  }

  function exportState() {
    if (!requireAccount()) {
      return;
    }
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "novasplit-export.json";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!requireAccount()) {
      return;
    }
    const rows = [
      ["date", "group", "title", "merchant", "amount", "paid_by", "category", "status", "payment_method", "tags", "note"],
      ...state.expenses.map((expense) => [
        expense.paidAt,
        groupById(expense.groupId)?.name || "",
        expense.title,
        expense.merchant || "",
        expense.amount,
        memberById(expense.payerId)?.name || "",
        expense.category,
        expense.status || "cleared",
        expense.paymentMethod || "",
        (expense.tags || []).join("|"),
        expense.note || ""
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    downloadBlob(csv, "novasplit-expenses.csv", "text/csv");
  }

  function importState(event) {
    if (!requireAccount()) {
      return;
    }
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        state = normalizeRupeeState({ ...structuredClone(defaultState), ...imported });
        saveState();
        render();
        setMessage("Import complete.");
      } catch (error) {
        setMessage("Import failed. Choose a NovaSplit JSON export.");
      } finally {
        event.target.value = "";
      }
    });
    reader.readAsText(file);
  }

  async function shareSettlements() {
    if (!requireAccount()) {
      return;
    }
    const settlements = currentSettlements();
    const message = settlements.length
      ? settlements.map((item) => `${item.fromName} pays ${item.toName}: ${formatMoney(item.amount)}`).join("\n")
      : "Everyone is settled.";

    if (navigator.share) {
      await navigator.share({ title: "NovaSplit settlement plan", text: message });
      return;
    }
    await navigator.clipboard?.writeText(message);
    setSaveStatus("Plan copied");
  }

  function postDueRecurring() {
    if (!requireAccount()) {
      return;
    }
    const today = todayIso();
    const due = state.expenses.filter((expense) => {
      return expense.recurring && expense.recurring.interval !== "none" && expense.recurring.nextDate <= today;
    });
    due.forEach((expense) => {
      const nextDate = expense.recurring.nextDate || today;
      state.expenses.push({
        ...structuredClone(expense),
        id: createId("e"),
        paidAt: nextDate,
        title: `${expense.title} (${titleCase(expense.recurring.interval)})`,
        receipt: null,
        recurring: { interval: "none", nextDate: "" }
      });
      expense.recurring.nextDate = nextRecurringDate(nextDate, expense.recurring.interval);
    });
    saveState();
    render();
    setMessage(due.length ? `${due.length} recurring expense${due.length === 1 ? "" : "s"} posted.` : "No recurring expenses are due.");
  }

  function startExpenseEdit(expenseId) {
    if (!requireAccount()) {
      return;
    }
    const expense = state.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      return;
    }
    const form = elements.expenseForm;
    form.elements.namedItem("editingExpenseId").value = expense.id;
    form.elements.namedItem("title").value = expense.title || "";
    form.elements.namedItem("paidAt").value = expense.paidAt || todayIso();
    form.elements.namedItem("merchant").value = expense.merchant || "";
    form.elements.namedItem("amount").value = expense.amount || "";
    form.elements.namedItem("status").value = expense.status || "cleared";
    form.elements.namedItem("paymentMethod").value = expense.paymentMethod || "upi";
    form.elements.namedItem("groupId").value = expense.groupId;
    syncGroupMemberControls();
    form.elements.namedItem("payerId").value = expense.payerId;
    form.elements.namedItem("category").value = expense.category || "food";
    form.elements.namedItem("tags").value = (expense.tags || []).join(", ");
    form.elements.namedItem("note").value = expense.note || "";
    form.elements.namedItem("recurringInterval").value = expense.recurring?.interval || "none";
    form.querySelectorAll('input[name="participants"]').forEach((input) => {
      input.checked = expense.participants.includes(input.value);
    });
    form.querySelector(`input[name="splitType"][value="${expense.split?.type || "equal"}"]`).checked = true;
    syncCustomSplitControls();
    if (expense.split?.values) {
      Object.entries(expense.split.values).forEach(([memberId, value]) => {
        const input = form.elements.namedItem(`custom-${memberId}`);
        if (input) {
          input.value = value;
        }
      });
    }
    elements.expenseSubmitLabel.textContent = "Update expense";
    elements.cancelEditButton.hidden = false;
    focusFirstField(form);
  }

  function cancelExpenseEdit(reset = true) {
    const form = elements.expenseForm;
    form.elements.namedItem("editingExpenseId").value = "";
    elements.expenseSubmitLabel.textContent = "Save expense";
    elements.cancelEditButton.hidden = true;
    if (reset) {
      form.reset();
      elements.currencySelect.value = "INR";
      form.elements.namedItem("paidAt").value = todayIso();
      syncGroupMemberControls();
    }
  }

  function duplicateExpense(expenseId) {
    if (!requireAccount()) {
      return;
    }
    const expense = state.expenses.find((item) => item.id === expenseId);
    if (!expense) {
      return;
    }
    state.expenses.push({
      ...structuredClone(expense),
      id: createId("e"),
      title: `${expense.title} copy`,
      paidAt: todayIso()
    });
    saveState();
    render();
  }

  function resetDemo() {
    if (!requireAccount()) {
      return;
    }
    state = personalizeState(structuredClone(defaultState), currentUser);
    saveState();
    render();
  }

  function startCanvasLoop() {
    const canvas = elements.balanceCanvas;
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(640, Math.floor(rect.width * ratio));
    canvas.height = Math.max(260, Math.floor(rect.height * ratio));

    const draw = () => {
      canvasPhase += 0.006;
      drawBalanceCanvas(context, canvas.width, canvas.height, ratio);
      animationFrame = window.requestAnimationFrame(draw);
    };
    draw();
  }

  function drawBalanceCanvas(context, width, height, ratio) {
    const balances = Ledger.calculateBalances(state, state.activeGroupId);
    const maxNet = Math.max(...balances.map((balance) => Math.abs(balance.net)), 1);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.32;

    context.clearRect(0, 0, width, height);
    context.save();
    context.lineWidth = 1 * ratio;

    for (let index = 0; index < 9; index += 1) {
      const y = (height / 9) * index + Math.sin(canvasPhase + index) * 4 * ratio;
      context.strokeStyle = `rgba(244, 241, 232, ${0.035 + index * 0.002})`;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(69, 224, 191, 0.16)";
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.36, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(centerX, centerY, radius * 0.68, 0, Math.PI * 2);
    context.stroke();

    balances.forEach((balance, index) => {
      const angle = (Math.PI * 2 * index) / balances.length + canvasPhase * 0.35;
      const distance = radius * (0.72 + Math.abs(balance.net) / maxNet * 0.28);
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const positive = balance.net >= 0;
      const color = positive ? "69, 224, 191" : "255, 111, 97";
      const nodeSize = (12 + Math.abs(balance.net) / maxNet * 16) * ratio;

      context.strokeStyle = `rgba(${color}, 0.42)`;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.lineTo(x, y);
      context.stroke();

      context.fillStyle = `rgba(${color}, 0.14)`;
      context.beginPath();
      context.arc(x, y, nodeSize * 1.8, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = positive ? "#45e0bf" : "#ff6f61";
      context.beginPath();
      context.arc(x, y, nodeSize, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#f4f1e8";
      context.font = `${Math.max(11, 12 * ratio)}px Inter, sans-serif`;
      context.textAlign = x > centerX ? "left" : "right";
      context.fillText(balance.name, x + (x > centerX ? 18 : -18) * ratio, y - 2 * ratio);

      context.fillStyle = positive ? "#45e0bf" : "#ff6f61";
      context.font = `700 ${Math.max(11, 12 * ratio)}px Inter, sans-serif`;
      context.fillText(formatMoney(Math.abs(balance.net)), x + (x > centerX ? 18 : -18) * ratio, y + 16 * ratio);
    });

    context.fillStyle = "#f4f1e8";
    context.font = `800 ${Math.max(16, 20 * ratio)}px Inter, sans-serif`;
    context.textAlign = "center";
    context.fillText(activeGroupName(), centerX, centerY - 4 * ratio);
    context.fillStyle = "#aeb7ad";
    context.font = `${Math.max(11, 12 * ratio)}px Inter, sans-serif`;
    context.fillText("settlement vector", centerX, centerY + 18 * ratio);
    context.restore();
  }

  function currentSettlements() {
    return Ledger.optimizeSettlements(Ledger.calculateBalances(state, state.activeGroupId));
  }

  function getScopedExpenses(groupId) {
    if (!groupId || groupId === "all") {
      return state.expenses;
    }
    return state.expenses.filter((expense) => expense.groupId === groupId);
  }

  function memberById(id) {
    return state.members.find((member) => member.id === id);
  }

  function groupById(id) {
    return state.groups.find((group) => group.id === id);
  }

  function activeGroupName() {
    if (state.activeGroupId === "all") {
      return "All groups";
    }
    return groupById(state.activeGroupId)?.name || "All groups";
  }

  function requireAccount() {
    if (currentUser) {
      return true;
    }
    elements.authGate.hidden = false;
    setAuthMessage("Create an account or sign in first.");
    return false;
  }

  function publicUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar || initials(user.name),
      color: user.color || "#45e0bf"
    };
  }

  function findUserByEmail(email) {
    return accountStore.users.find((user) => user.email === email);
  }

  function personalizeState(nextState, user) {
    const normalized = normalizeRupeeState(structuredClone(nextState || defaultState));
    const profileId = normalized.profileMemberId || normalized.members[0]?.id;
    const profile = normalized.members.find((member) => member.id === profileId);
    if (profile && user) {
      profile.name = user.name;
      profile.avatar = user.avatar || initials(user.name);
      profile.color = user.color || profile.color;
    }
    return normalized;
  }

  function createStarterState(user) {
    const memberId = "m-owner";
    const groupId = "g-personal";
    return normalizeRupeeState({
      currency: "INR",
      profileMemberId: memberId,
      activeGroupId: "all",
      members: [
        {
          id: memberId,
          name: user.name,
          avatar: user.avatar || initials(user.name),
          color: user.color || "#45e0bf"
        }
      ],
      groups: [
        {
          id: groupId,
          name: "My group",
          code: "MG",
          budget: 0,
          memberIds: [memberId]
        }
      ],
      expenses: []
    });
  }

  function hasLegacyState() {
    return Boolean(localStorage.getItem(storageKey));
  }

  function normalizeTags(value) {
    if (Array.isArray(value)) {
      return value.map((tag) => String(tag).trim()).filter(Boolean);
    }
    return String(value || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  function nextRecurringDate(dateValue, interval) {
    const date = new Date(`${dateValue || todayIso()}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return todayIso();
    }
    if (interval === "weekly") {
      date.setDate(date.getDate() + 7);
    } else if (interval === "monthly") {
      date.setMonth(date.getMonth() + 1);
    } else if (interval === "quarterly") {
      date.setMonth(date.getMonth() + 3);
    }
    return date.toISOString().slice(0, 10);
  }

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function monthKey(value) {
    return value ? String(value).slice(0, 7) : "";
  }

  function formatMonth(value) {
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(new Date(`${value}-01T00:00:00`));
  }

  function sortExpenses(a, b, sort) {
    if (sort === "oldest") {
      return new Date(a.paidAt) - new Date(b.paidAt);
    }
    if (sort === "amount-desc") {
      return Number(b.amount || 0) - Number(a.amount || 0);
    }
    if (sort === "amount-asc") {
      return Number(a.amount || 0) - Number(b.amount || 0);
    }
    return new Date(b.paidAt) - new Date(a.paidAt);
  }

  function readReceipt(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve({
          name: file.name,
          type: file.type,
          dataUrl: String(reader.result || "")
        });
      });
      reader.addEventListener("error", reject);
      reader.readAsDataURL(file);
    });
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  async function hashPassword(password, saltHex) {
    if (window.crypto?.subtle && window.TextEncoder) {
      const encoder = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        "PBKDF2",
        false,
        ["deriveBits"]
      );
      const bits = await window.crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: hexToBytes(saltHex),
          iterations: hashIterations,
          hash: "SHA-256"
        },
        key,
        256
      );
      return bytesToHex(new Uint8Array(bits));
    }
    return fallbackHash(`${saltHex}:${password}`);
  }

  function randomHex(length) {
    const bytes = new Uint8Array(length);
    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      bytes.forEach((_, index) => {
        bytes[index] = Math.floor(Math.random() * 256);
      });
    }
    return bytesToHex(bytes);
  }

  function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }
    return bytes;
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function fallbackHash(value) {
    let hashA = 0xdeadbeef;
    let hashB = 0x41c6ce57;
    for (let index = 0; index < value.length; index += 1) {
      const code = value.charCodeAt(index);
      hashA = Math.imul(hashA ^ code, 2654435761);
      hashB = Math.imul(hashB ^ code, 1597334677);
    }
    hashA = Math.imul(hashA ^ (hashA >>> 16), 2246822507) ^ Math.imul(hashB ^ (hashB >>> 13), 3266489909);
    hashB = Math.imul(hashB ^ (hashB >>> 16), 2246822507) ^ Math.imul(hashA ^ (hashA >>> 13), 3266489909);
    return `${(hashB >>> 0).toString(16).padStart(8, "0")}${(hashA >>> 0).toString(16).padStart(8, "0")}`;
  }

  function checkedValues(form, name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((input) => input.value);
  }

  function getFormValue(form, name) {
    return new FormData(form).get(name);
  }

  function setMessage(message) {
    elements.expenseMessage.textContent = message;
    window.setTimeout(() => {
      if (elements.expenseMessage.textContent === message) {
        elements.expenseMessage.textContent = "";
      }
    }, 2800);
  }

  function setAuthMessage(message) {
    elements.authMessage.textContent = message;
  }

  function focusFirstField(form) {
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const first = form.querySelector("input, select, textarea, button");
      first?.focus();
    }, 260);
  }

  function formatMoney(value) {
    const amount = Number(value || 0);
    const hasPaise = Math.abs(amount % 1) > 0.009;
    const formatted = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: hasPaise ? 2 : 0,
      maximumFractionDigits: 2
    }).format(amount);
    return `Rs ${formatted}`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
  }

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function createId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
})();
