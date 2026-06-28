export interface Split {
  member: string; // Wallet Address
  amount: bigint; // Stroops
}

export interface Expense {
  id: bigint;
  group_id: bigint;
  title: string;
  description: string;
  amount: bigint; // Stroops
  paid_by: string; // Wallet Address
  splits: Split[];
  category: string;
  date: bigint; // Unix timestamp
}

export interface Settlement {
  id: bigint;
  group_id: bigint;
  sender: string; // Wallet Address
  receiver: string; // Wallet Address
  amount: bigint; // Stroops
  tx_hash: string;
  date: bigint; // Unix timestamp
}

export interface Debt {
  from: string;
  to: string;
  amount: bigint;
}

export interface MemberBalance {
  member: string;
  netBalance: bigint; // positive = owed money, negative = owes money
}

/**
 * Calculates the net balance for each member in the group.
 * Positive balance: Owed money.
 * Negative balance: Owes money.
 */
export function calculateBalances(
  members: string[],
  expenses: Expense[],
  settlements: Settlement[]
): MemberBalance[] {
  const balanceMap: Record<string, bigint> = {};

  // Initialize all members to 0
  members.forEach((m) => {
    balanceMap[m] = 0n;
  });

  // Process expenses
  expenses.forEach((exp) => {
    const paidBy = exp.paid_by;
    // Add full amount to the payer's balance
    if (balanceMap[paidBy] !== undefined) {
      balanceMap[paidBy] += exp.amount;
    }

    // Subtract split amounts from each member's balance
    exp.splits.forEach((split) => {
      if (balanceMap[split.member] !== undefined) {
        balanceMap[split.member] -= split.amount;
      }
    });
  });

  // Process settlements
  settlements.forEach((set) => {
    // Sender paid money, so they owe less (balance goes up)
    if (balanceMap[set.sender] !== undefined) {
      balanceMap[set.sender] += set.amount;
    }
    // Receiver got paid, so they are owed less (balance goes down)
    if (balanceMap[set.receiver] !== undefined) {
      balanceMap[set.receiver] -= set.amount;
    }
  });

  return members.map((m) => ({
    member: m,
    netBalance: balanceMap[m] || 0n,
  }));
}

/**
 * Consolidates debts to find the minimum number of transactions needed to settle.
 */
export function computeSettlements(balances: MemberBalance[]): Debt[] {
  // Filter and split into debtors and creditors
  // We make shallow copies and keep balances as sign-correct bigints
  const debtors = balances
    .filter((b) => b.netBalance < 0n)
    .map((b) => ({ member: b.member, balance: b.netBalance }))
    .sort((a, b) => (a.balance < b.balance ? -1 : 1)); // Ascending (most negative first)

  const creditors = balances
    .filter((b) => b.netBalance > 0n)
    .map((b) => ({ member: b.member, balance: b.netBalance }))
    .sort((a, b) => (a.balance > b.balance ? -1 : 1)); // Descending (most positive first)

  const debts: Debt[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const oweAmount = -debtor.balance;
    const owedAmount = creditor.balance;

    if (oweAmount === 0n) {
      dIdx++;
      continue;
    }
    if (owedAmount === 0n) {
      cIdx++;
      continue;
    }

    const settleAmount = oweAmount < owedAmount ? oweAmount : owedAmount;

    debts.push({
      from: debtor.member,
      to: creditor.member,
      amount: settleAmount,
    });

    debtor.balance += settleAmount;
    creditor.balance -= settleAmount;

    if (debtor.balance === 0n) {
      dIdx++;
    }
    if (creditor.balance === 0n) {
      cIdx++;
    }
  }

  return debts;
}
