import React, { useState, useMemo } from "react";
import { useContract } from "./ContractProvider";
import { useWallet } from "./WalletProvider";
import { calculateBalances, computeSettlements } from "../utils/settlement";
import type { MemberBalance, Debt } from "../utils/settlement";
import {
  ArrowLeft,
  UserPlus,
  Plus,
  DollarSign,
  Send,
  Calendar,
  ArrowRight,
  Globe,
  Loader2,
  ExternalLink,
  ChevronRight,
  FileText
} from "lucide-react";
import { AddExpenseModal } from "./AddExpenseModal";
import { SettleUpModal } from "./SettleUpModal";

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍔",
  Travel: "✈️",
  Accommodation: "🏨",
  Entertainment: "🎬",
  Utilities: "⚡",
  Other: "📦",
};

export const GroupDetails: React.FC = () => {
  const { address } = useWallet();
  const {
    activeGroupDetails,
    clearActiveGroup,
    addMember,
    rpcStatus,
  } = useContract();

  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [memberErrorMsg, setMemberErrorMsg] = useState<string | null>(null);
  const [invitingMember, setInvitingMember] = useState(false);

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);

  // Safely extract active group data
  const { group, expenses, settlements } = activeGroupDetails || {
    group: { id: 0n, name: "", creator: "", members: [] },
    expenses: [],
    settlements: [],
  };

  // 1. Calculate individual balances in the group
  const balances: MemberBalance[] = useMemo(() => {
    return calculateBalances(group.members, expenses, settlements);
  }, [group.members, expenses, settlements]);

  // 2. Compute minimum settlements needed (debt graph)
  const suggestedDebts: Debt[] = useMemo(() => {
    return computeSettlements(balances);
  }, [balances]);

  // 3. User's specific balance in this group
  const userBalance = useMemo(() => {
    if (!address) return 0n;
    return balances.find((b) => b.member.toLowerCase() === address.toLowerCase())?.netBalance || 0n;
  }, [balances, address]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberErrorMsg(null);
    const trimmedAddr = newMemberAddress.trim();

    // Standard Stellar public key validation
    if (!trimmedAddr) {
      setMemberErrorMsg("Public key is required");
      return;
    }
    if (!/^G[A-Z2-7]{55}$/.test(trimmedAddr)) {
      setMemberErrorMsg("Invalid Stellar public key format");
      return;
    }
    if (group.members.map((m) => m.toLowerCase()).includes(trimmedAddr.toLowerCase())) {
      setMemberErrorMsg("User is already a member of this group");
      return;
    }

    setInvitingMember(true);
    try {
      await addMember(group.id, trimmedAddr);
      setNewMemberAddress("");
    } catch (err: any) {
      console.error(err);
      setMemberErrorMsg(err.message || "Failed to add member to group.");
    } finally {
      setInvitingMember(false);
    }
  };

  const stroopsToXlmStr = (stroops: bigint): string => {
    return (Number(stroops) / 10000000).toFixed(2);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isGroupOwner = group.creator.toLowerCase() === address?.toLowerCase();

  return (
    <div className="flex-1 py-8 px-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Back to Dashboard Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={clearActiveGroup}
          className="p-2.5 bg-white/5 border border-white/10 text-gray-400 hover:text-white rounded-2xl transition hover:scale-105"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block">
            Workspace Detail
          </span>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-gray-100 tracking-tight">{group.name}</h2>
            <span className="text-[10px] text-gray-500 font-mono mt-1">#{group.id.toString()}</span>
          </div>
        </div>
      </div>

      {/* Overview stats cards & Invite actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Stats Card */}
        <div className="glass-panel p-6 rounded-3xl relative overflow-hidden flex flex-col justify-between h-44">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
              Your Workspace Balance
            </span>
            <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {userBalance > 0n ? (
              <h3 className="text-3xl font-extrabold text-green-400 font-mono">
                +{stroopsToXlmStr(userBalance)}{" "}
                <span className="text-sm font-normal text-gray-400">XLM</span>
              </h3>
            ) : userBalance < 0n ? (
              <h3 className="text-3xl font-extrabold text-red-400 font-mono">
                -{stroopsToXlmStr(-userBalance)}{" "}
                <span className="text-sm font-normal text-gray-400">XLM</span>
              </h3>
            ) : (
              <h3 className="text-3xl font-extrabold text-gray-400 font-mono">0.00</h3>
            )}
            <span className="text-gray-500 text-[10px]">
              {userBalance > 0n
                ? "You are owed in this group"
                : userBalance < 0n
                ? "You owe in this group"
                : "You are fully settled up!"}
            </span>
          </div>
        </div>

        {/* Invite Friend Card */}
        <div className="glass-panel p-6 rounded-3xl lg:col-span-2 flex flex-col justify-between min-h-44">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              <span className="text-gray-200 text-sm font-bold">Invite Friend</span>
            </div>
            <p className="text-xs text-gray-400">
              {isGroupOwner
                ? "Add your friends using their Stellar wallet address. freighter will sign authorization."
                : "Only the workspace owner can invite new members."}
            </p>
          </div>

          <form onSubmit={handleAddMember} className="mt-4 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Friend's Stellar address (G...)"
                value={newMemberAddress}
                onChange={(e) => setNewMemberAddress(e.target.value)}
                disabled={!isGroupOwner || invitingMember}
                className="flex-1 glass-input px-4 py-2.5 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none font-mono disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isGroupOwner || invitingMember}
                className="glass-btn-primary px-5 py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                {invitingMember ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Invite
              </button>
            </div>
            {memberErrorMsg && (
              <span className="text-[10px] text-red-400 block">{memberErrorMsg}</span>
            )}
            {rpcStatus === "pending" && invitingMember && (
              <span className="text-[10px] text-purple-300 block flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Submitting membership extension to ledger...
              </span>
            )}
          </form>
        </div>
      </div>

      {/* Main Grid: Worksheets & Settlements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Members list, Debt consolidator */}
        <div className="space-y-8">
          {/* Members */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-200">Members ({group.members.length})</h3>
            <div className="glass-panel p-5 rounded-3xl space-y-3.5 max-h-52 overflow-y-auto">
              {balances.map(({ member, netBalance }) => (
                <div key={member} className="flex items-center justify-between border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-mono text-gray-200 truncate">
                      {truncateAddress(member)}
                    </span>
                    {member.toLowerCase() === group.creator.toLowerCase() && (
                      <span className="text-[9px] uppercase font-bold text-purple-400 mt-0.5 tracking-wider">
                        Creator
                      </span>
                    )}
                  </div>

                  {netBalance > 0n ? (
                    <span className="text-xs font-bold text-green-400 font-mono">
                      +{stroopsToXlmStr(netBalance)} XLM
                    </span>
                  ) : netBalance < 0n ? (
                    <span className="text-xs font-bold text-red-400 font-mono">
                      -{stroopsToXlmStr(-netBalance)} XLM
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                      Settled
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Graph */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-200">Settlement Graph</h3>
              <button
                onClick={() => setIsSettleUpOpen(true)}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white rounded-xl text-xs font-bold border border-white/5 flex items-center gap-1.5 cursor-pointer transition"
              >
                <Send className="w-3.5 h-3.5" />
                Settle Up
              </button>
            </div>
            
            <div className="glass-panel p-5 rounded-3xl space-y-3 h-56 overflow-y-auto">
              {suggestedDebts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <h4 className="text-xs font-bold text-gray-300">All Settled Up!</h4>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[12rem] mx-auto">
                      There are no active debts remaining in this group.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestedDebts.map((debt, idx) => {
                    const isMyDebt = debt.from.toLowerCase() === address?.toLowerCase();
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-2xl border ${
                          isMyDebt
                            ? "bg-purple-500/5 border-purple-500/20"
                            : "bg-white/5 border-white/5"
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1 text-xs text-gray-300">
                            <span className="font-semibold truncate">
                              {isMyDebt ? "You" : truncateAddress(debt.from)}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold truncate">
                              {debt.to.toLowerCase() === address?.toLowerCase() ? "You" : truncateAddress(debt.to)}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-0.5 font-mono">
                            Amount: {stroopsToXlmStr(debt.amount)} XLM
                          </span>
                        </div>

                        {isMyDebt && (
                          <button
                            onClick={() => {
                              setIsSettleUpOpen(true);
                            }}
                            className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white rounded-xl text-[10px] font-bold cursor-pointer transition hover:bg-purple-500/30"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Expenses list & Settlements list */}
        <div className="lg:col-span-2 space-y-8">
          {/* Expenses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-200">Expense List</h3>
              <button
                onClick={() => setIsAddExpenseOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl text-xs font-bold shadow-lg shadow-purple-500/10 flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
            </div>

            <div className="glass-panel p-6 rounded-3xl h-[28rem] overflow-y-auto space-y-4">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  <FileText className="w-12 h-12 text-gray-700" />
                  <div>
                    <h4 className="font-bold text-gray-300 text-sm">No Expenses Logged</h4>
                    <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                      Log shared pizza bills, servers, subscriptions, or trip costs.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id.toString()}
                      className="p-4 bg-white/5 border border-white/5 rounded-3xl space-y-3.5 relative group hover:border-purple-500/20 transition-all"
                    >
                      {/* Top Row: Category icon, Title, Amount */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl p-1 bg-white/5 rounded-xl border border-white/5">
                            {CATEGORY_ICONS[exp.category] || "📦"}
                          </span>
                          <div>
                            <h4 className="font-bold text-gray-100 text-sm group-hover:text-purple-400 transition-colors">
                              {exp.title}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5 italic">
                              {exp.description || "No description"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-100 text-sm font-mono block">
                            {stroopsToXlmStr(exp.amount)} XLM
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">
                            Paid by: {truncateAddress(exp.paid_by)}
                          </span>
                        </div>
                      </div>

                      {/* Splits grid info */}
                      <div className="border-t border-white/5 pt-3 flex flex-wrap gap-2.5">
                        {exp.splits.map((split, i) => (
                          <div
                            key={i}
                            className="bg-white/5 border border-white/5 px-2.5 py-1 rounded-xl text-[10px] text-gray-400 font-mono"
                          >
                            {truncateAddress(split.member)}:{" "}
                            <span className="text-purple-300">
                              {stroopsToXlmStr(split.amount)} XLM
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Date */}
                      <span className="absolute bottom-4 right-4 text-[9px] text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(Number(exp.date) * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settlements Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-200">Settlements History</h3>
            
            <div className="glass-panel p-6 rounded-3xl h-60 overflow-y-auto space-y-4">
              {settlements.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2">
                  <Globe className="w-10 h-10 text-gray-700 animate-spin-slow" />
                  <div>
                    <h4 className="text-xs font-bold text-gray-300">No Settlements Registered</h4>
                    <p className="text-[10px] text-gray-500 mt-1 max-w-[14rem] mx-auto">
                      Instantly settle debts on Stellar. Completed settlement ledgers show here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((set) => (
                    <div
                      key={set.id.toString()}
                      className="p-3.5 bg-green-500/5 border border-green-500/10 rounded-2xl flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="font-mono text-green-300 font-semibold">
                          {truncateAddress(set.sender)}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        <span className="font-mono text-green-300 font-semibold">
                          {truncateAddress(set.receiver)}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="font-bold text-green-400 text-xs font-mono block">
                            {stroopsToXlmStr(set.amount)} XLM
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(Number(set.date) * 1000).toLocaleDateString()}
                          </span>
                        </div>
                        {/* Transaction Link */}
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${set.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-white/5 border border-white/5 text-gray-400 hover:text-white rounded-xl transition hover:scale-105"
                          title="View on Stellar Expert Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        groupId={group.id}
        members={group.members}
      />

      <SettleUpModal
        isOpen={isSettleUpOpen}
        onClose={() => setIsSettleUpOpen(false)}
        groupId={group.id}
        suggestedDebts={suggestedDebts}
      />
    </div>
  );
};
