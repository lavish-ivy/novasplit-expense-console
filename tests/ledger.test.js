const assert = require("node:assert/strict");
const Ledger = require("../ledger.js");

const state = {
  members: [
    { id: "a", name: "Ava", avatar: "AV", color: "#45e0bf" },
    { id: "b", name: "Rio", avatar: "RI", color: "#f7c65a" },
    { id: "c", name: "Nia", avatar: "NI", color: "#ff6f61" }
  ],
  expenses: [
    {
      id: "e1",
      amount: 90,
      groupId: "g1",
      payerId: "a",
      participants: ["a", "b", "c"],
      split: { type: "equal" }
    },
    {
      id: "e2",
      amount: 60,
      groupId: "g1",
      payerId: "b",
      participants: ["a", "c"],
      split: { type: "custom", values: { a: 20, c: 40 } }
    }
  ]
};

const balances = Ledger.calculateBalances(state, "g1");
const byId = Object.fromEntries(balances.map((balance) => [balance.memberId, balance]));

assert.equal(byId.a.paid, 90);
assert.equal(byId.a.share, 50);
assert.equal(byId.a.net, 40);
assert.equal(byId.b.paid, 60);
assert.equal(byId.b.share, 30);
assert.equal(byId.b.net, 30);
assert.equal(byId.c.paid, 0);
assert.equal(byId.c.share, 70);
assert.equal(byId.c.net, -70);

const settlements = Ledger.optimizeSettlements(balances);
assert.deepEqual(settlements, [
  { fromId: "c", fromName: "Nia", toId: "a", toName: "Ava", amount: 40 },
  { fromId: "c", fromName: "Nia", toId: "b", toName: "Rio", amount: 30 }
]);

const categories = Ledger.categoryTotals({
  ...state,
  expenses: [
    { amount: 10, category: "food", groupId: "g1" },
    { amount: 15.55, category: "food", groupId: "g1" },
    { amount: 5, category: "travel", groupId: "g2" }
  ]
}, "g1");

assert.deepEqual(categories, { food: 25.55 });

console.log("ledger tests passed");
