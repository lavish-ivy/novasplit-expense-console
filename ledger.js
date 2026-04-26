(function ledgerFactory(globalScope) {
  "use strict";

  const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

  const createEmptyBalance = (member) => ({
    memberId: member.id,
    name: member.name,
    color: member.color,
    avatar: member.avatar,
    paid: 0,
    share: 0,
    net: 0
  });

  function splitShares(expense) {
    const amount = roundMoney(expense.amount);
    const participants = Array.isArray(expense.participants) ? expense.participants : [];
    const split = expense.split || { type: "equal" };

    if (split.type === "custom") {
      return participants.reduce((shares, memberId) => {
        shares[memberId] = roundMoney(split.values && split.values[memberId]);
        return shares;
      }, {});
    }

    if (!participants.length) {
      return {};
    }

    const base = Math.floor((amount / participants.length) * 100) / 100;
    let remainder = roundMoney(amount - base * participants.length);
    return participants.reduce((shares, memberId) => {
      const extra = remainder > 0 ? 0.01 : 0;
      shares[memberId] = roundMoney(base + extra);
      remainder = roundMoney(remainder - extra);
      return shares;
    }, {});
  }

  function calculateBalances(state, groupId) {
    let members = state.members || [];
    if (groupId && groupId !== "all" && Array.isArray(state.groups)) {
      const group = state.groups.find((item) => item.id === groupId);
      if (group && Array.isArray(group.memberIds)) {
        members = members.filter((member) => group.memberIds.includes(member.id));
      }
    }
    const balances = new Map(members.map((member) => [member.id, createEmptyBalance(member)]));
    const expenses = (state.expenses || []).filter((expense) => {
      return !groupId || groupId === "all" || expense.groupId === groupId;
    });

    expenses.forEach((expense) => {
      const amount = roundMoney(expense.amount);
      const payer = balances.get(expense.payerId);
      if (payer) {
        payer.paid = roundMoney(payer.paid + amount);
      }

      const shares = splitShares(expense);
      Object.entries(shares).forEach(([memberId, share]) => {
        const balance = balances.get(memberId);
        if (balance) {
          balance.share = roundMoney(balance.share + share);
        }
      });
    });

    return Array.from(balances.values()).map((balance) => ({
      ...balance,
      net: roundMoney(balance.paid - balance.share)
    }));
  }

  function optimizeSettlements(balances) {
    const debtors = balances
      .filter((balance) => balance.net < -0.009)
      .map((balance) => ({ ...balance, amount: roundMoney(Math.abs(balance.net)) }))
      .sort((a, b) => b.amount - a.amount);
    const creditors = balances
      .filter((balance) => balance.net > 0.009)
      .map((balance) => ({ ...balance, amount: roundMoney(balance.net) }))
      .sort((a, b) => b.amount - a.amount);

    const settlements = [];
    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

      if (amount > 0) {
        settlements.push({
          fromId: debtor.memberId,
          fromName: debtor.name,
          toId: creditor.memberId,
          toName: creditor.name,
          amount
        });
      }

      debtor.amount = roundMoney(debtor.amount - amount);
      creditor.amount = roundMoney(creditor.amount - amount);

      if (debtor.amount <= 0.009) {
        debtorIndex += 1;
      }

      if (creditor.amount <= 0.009) {
        creditorIndex += 1;
      }
    }

    return settlements;
  }

  function categoryTotals(state, groupId) {
    const totals = {};
    (state.expenses || []).forEach((expense) => {
      if (groupId && groupId !== "all" && expense.groupId !== groupId) {
        return;
      }
      const category = expense.category || "other";
      totals[category] = roundMoney((totals[category] || 0) + Number(expense.amount || 0));
    });
    return totals;
  }

  const api = {
    calculateBalances,
    categoryTotals,
    optimizeSettlements,
    roundMoney,
    splitShares
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.Ledger = api;
})(typeof window !== "undefined" ? window : globalThis);
