(function appFactory() {
  "use strict";

  const storageKey = "novasplit-state-v1";
  const palette = ["#45e0bf", "#f7c65a", "#ff6f61", "#a895ff", "#9fc2ff", "#b3ea6b"];

  const defaultState = {
    currency: "USD",
    profileMemberId: "m-ava",
    activeGroupId: "all",
    members: [
      { id: "m-ava", name: "Ava", avatar: "AV", color: "#45e0bf" },
      { id: "m-rio", name: "Rio", avatar: "RI", color: "#f7c65a" },
      { id: "m-zed", name: "Zed", avatar: "ZE", color: "#ff6f61" },
      { id: "m-nia", name: "Nia", avatar: "NI", color: "#a895ff" }
    ],
    groups: [
      { id: "g-orbit", name: "Orbit House", code: "OH", budget: 3200, memberIds: ["m-ava", "m-rio", "m-zed", "m-nia"] },
      { id: "g-kyoto", name: "Kyoto Sprint", code: "KS", budget: 5400, memberIds: ["m-ava", "m-rio", "m-nia"] },
      { id: "g-lab", name: "Design Lab", code: "DL", budget: 1800, memberIds: ["m-ava", "m-zed"] }
    ],
    expenses: [
      {
        id: "e-1",
        title: "Launch dinner",
        amount: 286.4,
        currency: "USD",
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
        amount: 1180,
        currency: "USD",
        category: "stay",
        groupId: "g-kyoto",
        payerId: "m-rio",
        paidAt: "2026-04-20",
        participants: ["m-ava", "m-rio", "m-nia"],
        split: { type: "custom", values: { "m-ava": 420, "m-rio": 340, "m-nia": 420 } },
        note: "Nia and Ava took the larger pods."
      },
      {
        id: "e-3",
        title: "Prototype materials",
        amount: 640,
        currency: "USD",
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
        amount: 168,
        currency: "USD",
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
        amount: 214.8,
        currency: "USD",
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

  let state = loadState();
  let animationFrame = 0;
  let canvasPhase = 0;

  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    [
      "activeScopeLabel",
      "applySettlementButton",
      "balanceCanvas",
      "categoryBars",
      "countMetric",
      "currencySelect",
      "customSplits",
      "expenseForm",
      "expenseGroupSelect",
      "expenseList",
      "expenseMessage",
      "exportButton",
      "focusExpenseButton",
      "focusMemberButton",
      "groupForm",
      "groupList",
      "groupMemberList",
      "memberForm",
      "netMetric",
      "oweMetric",
      "owedMetric",
      "participantList",
      "payerSelect",
      "personList",
      "resetButton",
      "searchInput"
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
    elements.expenseGroupSelect.addEventListener("change", syncGroupMemberControls);
    elements.currencySelect.addEventListener("change", (event) => {
      state.currency = event.target.value;
      saveState();
      render();
    });
    elements.searchInput.addEventListener("input", renderExpenses);
    elements.exportButton.addEventListener("click", exportState);
    elements.resetButton.addEventListener("click", resetDemo);
    elements.applySettlementButton.addEventListener("click", applyNextSettlement);
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

  function loadState() {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) {
        return structuredClone(defaultState);
      }
      return { ...structuredClone(defaultState), ...JSON.parse(saved) };
    } catch (error) {
      console.warn("Unable to load saved state", error);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function render() {
    elements.currencySelect.value = state.currency;
    renderGroups();
    renderSelectors();
    syncGroupMemberControls();
    renderMetrics();
    renderExpenses();
    renderSettlements();
    renderPeople();
    renderCategoryBars();
    refreshIcons();
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
    const isCustom = splitType === "custom";

    elements.customSplits.hidden = !isCustom;
    if (!isCustom) {
      elements.customSplits.innerHTML = "";
      return;
    }

    const existingValues = new FormData(elements.expenseForm);
    const equalAmount = participantIds.length ? Ledger.roundMoney(amount / participantIds.length) : 0;
    elements.customSplits.innerHTML = participantIds
      .map((memberId) => {
        const member = memberById(memberId);
        const current = existingValues.get(`custom-${memberId}`) || equalAmount || "";
        return `
          <label class="custom-split-row">
            <span>${escapeHtml(member?.name || "Unknown")}</span>
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

  function renderExpenses() {
    const query = elements.searchInput.value.trim().toLowerCase();
    const expenses = getScopedExpenses(state.activeGroupId)
      .filter((expense) => {
        const haystack = [expense.title, expense.category, expense.note, memberById(expense.payerId)?.name]
          .join(" ")
          .toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));

    if (!expenses.length) {
      elements.expenseList.innerHTML = `<div class="empty-state">No expenses match this view.</div>`;
      return;
    }

    elements.expenseList.innerHTML = expenses
      .map((expense) => {
        const payer = memberById(expense.payerId);
        const group = groupById(expense.groupId);
        return `
          <article class="expense-card">
            <div class="expense-main">
              <div class="expense-title-row">
                <strong>${escapeHtml(expense.title)}</strong>
                <span class="category-tag">${escapeHtml(expense.category)}</span>
              </div>
              <div class="expense-meta">
                Paid by ${escapeHtml(payer?.name || "Unknown")} in ${escapeHtml(group?.name || "Group")}
                on ${escapeHtml(formatDate(expense.paidAt))}. Split ${escapeHtml(expense.split?.type || "equal")}.
              </div>
              ${expense.note ? `<p class="expense-note">${escapeHtml(expense.note)}</p>` : ""}
            </div>
            <div class="expense-amount">
              <strong>${formatMoney(expense.amount, expense.currency)}</strong>
              <button class="delete-button" type="button" data-delete-expense="${escapeHtml(expense.id)}">Delete</button>
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

  function handleExpenseSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
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
    if (splitType === "custom") {
      const values = {};
      let customTotal = 0;
      participants.forEach((memberId) => {
        const value = Ledger.roundMoney(data.get(`custom-${memberId}`) || 0);
        values[memberId] = value;
        customTotal = Ledger.roundMoney(customTotal + value);
      });
      if (Math.abs(customTotal - amount) > 0.009) {
        setMessage(`Custom split must equal ${formatMoney(amount)}. Current total is ${formatMoney(customTotal)}.`);
        return;
      }
      split = { type: "custom", values };
    }

    state.expenses.push({
      id: createId("e"),
      title: String(data.get("title") || "").trim(),
      amount,
      currency: state.currency,
      category: data.get("category"),
      groupId: data.get("groupId"),
      payerId: data.get("payerId"),
      paidAt: new Date().toISOString().slice(0, 10),
      participants,
      split,
      note: String(data.get("note") || "").trim()
    });

    form.reset();
    elements.currencySelect.value = state.currency;
    saveState();
    syncGroupMemberControls();
    setMessage("Expense saved.");
    render();
  }

  function handleMemberSubmit(event) {
    event.preventDefault();
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

  function applyNextSettlement() {
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
      currency: state.currency,
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

  function resetDemo() {
    state = structuredClone(defaultState);
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

  function focusFirstField(form) {
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => {
      const first = form.querySelector("input, select, textarea, button");
      first?.focus();
    }, 260);
  }

  function formatMoney(value, currency = state.currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(Number(value || 0));
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
