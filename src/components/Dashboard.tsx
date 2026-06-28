import React, { useState, useEffect, useCallback } from "react";
import { useContract } from "./ContractProvider";
import type { Group, Expense, Settlement } from "./ContractProvider";
import { useWallet } from "./WalletProvider";
import { calculateBalances } from "../utils/settlement";
import type { MemberBalance } from "../utils/settlement";
import { Client } from "devd";
import {
  Users,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import { CreateGroupModal } from "./CreateGroupModal";

interface GroupCardData {
  group: Group;
  userBalance: bigint; // positive = owed, negative = owes, 0 = settled
  memberCount: number;
}

export const Dashboard: React.FC = () => {
  const { address } = useWallet();
  const { groups, activityFeed, loadGroupDetails, rpcStatus } = useContract();

  const [groupCardData, setGroupCardData] = useState<GroupCardData[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [stats, setStats] = useState({
    totalGroups: 0,
    youAreOwed: 0n,
    youOwe: 0n,
    totalOutstanding: 0n,
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch balances across all groups to aggregate dashboard stats
  const calculateDashboardStats = useCallback(async () => {
    if (!address || groups.length === 0) {
      setStats({
        totalGroups: groups.length,
        youAreOwed: 0n,
        youOwe: 0n,
        totalOutstanding: 0n,
      });
      setGroupCardData(groups.map(g => ({ group: g, userBalance: 0n, memberCount: g.members.length })));
      return;
    }

    setLoadingStats(true);
    try {
      const client = new Client({
        contractId: "CDKCOKAMDDJIXHFTTVUY5GJPZRCC5645NKZ544WPI253RMYFXFH7T4KI",
        rpcUrl: "https://soroban-testnet.stellar.org",
        networkPassphrase: "Test SDF Network ; September 2015",
      });

      // Load expenses and settlements for all user groups in parallel
      const detailsPromises = groups.map(async (group) => {
        try {
          const [expensesRes, settlementsRes] = await Promise.all([
            client.get_group_expenses({ group_id: group.id }),
            client.get_group_settlements({ group_id: group.id }),
          ]);

          const mappedExpenses: Expense[] = expensesRes.result.map((e: any) => ({
            id: BigInt(e.id),
            group_id: BigInt(e.group_id),
            title: e.title.toString(),
            description: e.description.toString(),
            amount: BigInt(e.amount),
            paid_by: e.paid_by,
            splits: e.splits.map((s: any) => ({
              member: s.member,
              amount: BigInt(s.amount),
            })),
            category: e.category.toString(),
            date: BigInt(e.date),
          }));

          const mappedSettlements: Settlement[] = settlementsRes.result.map((s: any) => ({
            id: BigInt(s.id),
            group_id: BigInt(s.group_id),
            sender: s.sender,
            receiver: s.receiver,
            amount: BigInt(s.amount),
            tx_hash: s.tx_hash.toString(),
            date: BigInt(s.date),
          }));

          const groupBalances: MemberBalance[] = calculateBalances(
            group.members,
            mappedExpenses,
            mappedSettlements
          );

          const userBal = groupBalances.find((b) => b.member.toLowerCase() === address.toLowerCase())?.netBalance || 0n;

          return {
            groupId: group.id,
            userBalance: userBal,
          };
        } catch (err) {
          console.warn(`Error getting balance for group ${group.id}:`, err);
          return { groupId: group.id, userBalance: 0n };
        }
      });

      const results = await Promise.all(detailsPromises);

      // Accumulate aggregates
      let owedSum = 0n;
      let oweSum = 0n;

      const cardData: GroupCardData[] = groups.map((group) => {
        const matchingRes = results.find((r) => r.groupId === group.id);
        const bal = matchingRes ? matchingRes.userBalance : 0n;

        if (bal > 0n) {
          owedSum += bal;
        } else if (bal < 0n) {
          oweSum += -bal; // accumulate absolute debt
        }

        return {
          group,
          userBalance: bal,
          memberCount: group.members.length,
        };
      });

      setStats({
        totalGroups: groups.length,
        youAreOwed: owedSum,
        youOwe: oweSum,
        totalOutstanding: owedSum + oweSum,
      });

      setGroupCardData(cardData);
    } catch (err) {
      console.error("Error calculating dashboard statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  }, [groups, address]);

  // Recalculate stats when groups list changes or a transaction succeeds
  useEffect(() => {
    calculateDashboardStats();
  }, [groups, calculateDashboardStats, rpcStatus]);

  const stroopsToXlmStr = (stroops: bigint): string => {
    return (Number(stroops) / 10000000).toFixed(2);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex-1 py-8 px-6 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-100 tracking-tight">Dashboard</h2>
          <p className="text-gray-400 text-sm mt-1">
            Real-time developer expense settlement powered by Stellar Soroban.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="glass-btn-primary px-5 py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold text-white cursor-pointer self-start md:self-auto"
        >
          <PlusCircle className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Stats Section */}
      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-6 rounded-3xl h-32 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Groups */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors duration-300" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Total Groups
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-gray-100">{stats.totalGroups}</h3>
              <span className="text-gray-500 text-[10px]">Active workspaces</span>
            </div>
          </div>

          {/* Pending Amount */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors duration-300" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                Pending Balance
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-gray-100 font-mono">
                {stroopsToXlmStr(stats.totalOutstanding)} <span className="text-sm font-normal text-gray-400">XLM</span>
              </h3>
              <span className="text-gray-500 text-[10px]">Total outstanding splits</span>
            </div>
          </div>

          {/* You Owe */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-colors duration-300" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                You Owe
              </span>
              <div className="p-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-red-400 font-mono">
                {stroopsToXlmStr(stats.youOwe)} <span className="text-sm font-normal text-gray-400">XLM</span>
              </h3>
              <span className="text-gray-500 text-[10px]">Debts to settle up</span>
            </div>
          </div>

          {/* You Are Owed */}
          <div className="glass-panel p-6 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-colors duration-300" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                You Are Owed
              </span>
              <div className="p-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-extrabold text-green-400 font-mono">
                {stroopsToXlmStr(stats.youAreOwed)} <span className="text-sm font-normal text-gray-400">XLM</span>
              </h3>
              <span className="text-gray-500 text-[10px]">Pending payouts</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Groups & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Groups List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-200">Your Workspaces</h3>
          
          {groupCardData.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl text-center space-y-4">
              <Users className="w-12 h-12 text-gray-600 mx-auto" />
              <div className="max-w-xs mx-auto">
                <h4 className="font-bold text-gray-200 text-sm">No Workspaces Found</h4>
                <p className="text-xs text-gray-500 mt-1">
                  You are not a member of any expense sharing groups. Create one to get started.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="glass-btn-primary px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer"
              >
                Create Group
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {groupCardData.map(({ group, userBalance, memberCount }) => (
                <div
                  key={group.id.toString()}
                  onClick={() => loadGroupDetails(group.id)}
                  className="glass-panel glass-panel-hover p-6 rounded-3xl cursor-pointer flex flex-col justify-between h-44 relative group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-gray-100 text-md truncate group-hover:text-purple-400 transition-colors">
                        {group.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-mono">
                        #{group.id.toString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 block mt-1 font-mono">
                      Owner: {truncateAddress(group.creator)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-xs text-gray-400 font-medium">
                      {memberCount} members
                    </span>

                    {/* Balance badge */}
                    {userBalance > 0n ? (
                      <span className="text-xs font-bold text-green-400 font-mono">
                        +{stroopsToXlmStr(userBalance)} XLM
                      </span>
                    ) : userBalance < 0n ? (
                      <span className="text-xs font-bold text-red-400 font-mono">
                        -{stroopsToXlmStr(-userBalance)} XLM
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Settled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-200">On-Chain Activity</h3>
          
          <div className="glass-panel rounded-3xl p-6 h-[24rem] overflow-y-auto space-y-4">
            {activityFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <Clock className="w-10 h-10 text-gray-700" />
                <div>
                  <h4 className="text-xs font-bold text-gray-300">Listening to ledger...</h4>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[12rem]">
                    Events will display here in real-time as expenses or settlements are logged.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activityFeed.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start text-xs border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="p-1.5 rounded-lg bg-white/5 text-purple-400 border border-white/5 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-300 font-medium break-words">
                        {item.details}
                      </p>
                      <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                        {item.groupName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};
