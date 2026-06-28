import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "./WalletProvider";
import { Client } from "devd";
import { scValToNative, rpc } from "@stellar/stellar-sdk";

export interface Split {
  member: string;
  amount: bigint; // Stroops
}

export interface Group {
  id: bigint;
  name: string;
  creator: string;
  members: string[];
}

export interface Expense {
  id: bigint;
  group_id: bigint;
  title: string;
  description: string;
  amount: bigint;
  paid_by: string;
  splits: Split[];
  category: string;
  date: bigint;
}

export interface Settlement {
  id: bigint;
  group_id: bigint;
  sender: string;
  receiver: string;
  amount: bigint;
  tx_hash: string;
  date: bigint;
}

export interface ActivityFeedItem {
  id: string;
  type: "group_created" | "member_added" | "expense_added" | "settlement_added";
  groupId: bigint;
  groupName: string;
  timestamp: number;
  details: string;
}

interface ContractContextType {
  groups: Group[];
  activeGroupDetails: {
    group: Group;
    expenses: Expense[];
    settlements: Settlement[];
  } | null;
  isLoading: boolean;
  contractError: string | null;
  activityFeed: ActivityFeedItem[];
  createGroup: (name: string) => Promise<bigint>;
  addMember: (groupId: bigint, memberAddress: string) => Promise<void>;
  addExpense: (
    groupId: bigint,
    title: string,
    description: string,
    amount: bigint,
    splits: Split[],
    category: string
  ) => Promise<bigint>;
  addSettlement: (
    groupId: bigint,
    receiver: string,
    amount: bigint,
    txHash: string
  ) => Promise<bigint>;
  loadGroupDetails: (groupId: bigint) => Promise<void>;
  fetchUserGroups: () => Promise<void>;
  clearActiveGroup: () => void;
  rpcStatus: "idle" | "pending" | "success" | "failure";
  rpcTxHash: string | null;
}

const ContractContext = createContext<ContractContextType | undefined>(undefined);

const CONTRACT_ID = "CDKCOKAMDDJIXHFTTVUY5GJPZRCC5645NKZ544WPI253RMYFXFH7T4KI";
const RPC_URL = "https://soroban-testnet.stellar.org";

export const ContractProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, signTx, isConnected, network } = useWallet();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroupDetails, setActiveGroupDetails] = useState<ContractContextType["activeGroupDetails"]>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contractError, setContractError] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  
  // Real-time tx status tracking
  const [rpcStatus, setRpcStatus] = useState<"idle" | "pending" | "success" | "failure">("idle");
  const [rpcTxHash, setRpcTxHash] = useState<string | null>(null);

  // References for event polling
  const lastSeenLedgerRef = useRef<number>(0);
  const pollingIntervalRef = useRef<any>(null);
  const activeGroupIdRef = useRef<bigint | null>(null);

  // Keep ref to active group id to access inside event listener
  useEffect(() => {
    activeGroupIdRef.current = activeGroupDetails ? activeGroupDetails.group.id : null;
  }, [activeGroupDetails]);

  // Instantiate contract client
  const getClient = useCallback(() => {
    return new Client({
      contractId: CONTRACT_ID,
      rpcUrl: RPC_URL,
      networkPassphrase: network,
      signTransaction: async (tx: any) => {
        const xdr = typeof tx === "string" ? tx : tx.toXDR();
        const signedXdr = await signTx(xdr);
        const { TransactionBuilder } = await import("@stellar/stellar-sdk");
        return TransactionBuilder.fromXDR(signedXdr, network) as any;
      },
    });
  }, [signTx, network]);

  const fetchUserGroups = useCallback(async () => {
    if (!address) {
      setGroups([]);
      return;
    }
    setIsLoading(true);
    setContractError(null);
    try {
      const client = getClient();
      const userGroups = await client.get_user_groups({ user: address });
      const mappedGroups: Group[] = userGroups.result.map((g: any) => ({
        id: BigInt(g.id),
        name: g.name.toString(),
        creator: g.creator,
        members: g.members,
      }));
      setGroups(mappedGroups);
    } catch (err: any) {
      console.error("Failed to load user groups:", err);
      setContractError(err.message || "Failed to fetch groups from ledger.");
    } finally {
      setIsLoading(false);
    }
  }, [address, getClient]);

  const loadGroupDetails = useCallback(async (groupId: bigint) => {
    setIsLoading(true);
    setContractError(null);
    try {
      const client = getClient();
      
      const [groupRes, expensesRes, settlementsRes] = await Promise.all([
        client.get_group({ group_id: groupId }),
        client.get_group_expenses({ group_id: groupId }),
        client.get_group_settlements({ group_id: groupId }),
      ]);

      const mappedGroup: Group = {
        id: BigInt(groupRes.result.id),
        name: groupRes.result.name.toString(),
        creator: groupRes.result.creator,
        members: groupRes.result.members,
      };

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

      setActiveGroupDetails({
        group: mappedGroup,
        expenses: mappedExpenses.sort((a, b) => Number(b.date - a.date)),
        settlements: mappedSettlements.sort((a, b) => Number(b.date - a.date)),
      });
    } catch (err: any) {
      console.error("Failed to load group details:", err);
      setContractError(err.message || "Failed to fetch group details.");
    } finally {
      setIsLoading(false);
    }
  }, [getClient]);

  const clearActiveGroup = () => {
    setActiveGroupDetails(null);
  };

  const createGroup = async (name: string): Promise<bigint> => {
    if (!address) throw new Error("Wallet not connected");
    setRpcStatus("pending");
    setRpcTxHash(null);
    setContractError(null);
    try {
      const client = getClient();
      const tx = await client.create_group({ creator: address, name });
      const result = await tx.signAndSend();
      
      setRpcTxHash(result.sendTransactionResponse?.hash || null);
      setRpcStatus("success");
      
      const newGroupId = BigInt(result.result);
      await fetchUserGroups();
      return newGroupId;
    } catch (err: any) {
      console.error("Group creation failed:", err);
      setRpcStatus("failure");
      setContractError(err.message || "Failed to create group.");
      throw err;
    }
  };

  const addMember = async (groupId: bigint, memberAddress: string) => {
    if (!address) throw new Error("Wallet not connected");
    setRpcStatus("pending");
    setRpcTxHash(null);
    setContractError(null);
    try {
      const client = getClient();
      const tx = await client.add_member({ group_id: groupId, member: memberAddress });
      const result = await tx.signAndSend();

      setRpcTxHash(result.sendTransactionResponse?.hash || null);
      setRpcStatus("success");

      await Promise.all([
        loadGroupDetails(groupId),
        fetchUserGroups()
      ]);
    } catch (err: any) {
      console.error("Failed to add member:", err);
      setRpcStatus("failure");
      setContractError(err.message || "Failed to add member to the group.");
      throw err;
    }
  };

  const addExpense = async (
    groupId: bigint,
    title: string,
    description: string,
    amount: bigint,
    splits: Split[],
    category: string
  ): Promise<bigint> => {
    if (!address) throw new Error("Wallet not connected");
    setRpcStatus("pending");
    setRpcTxHash(null);
    setContractError(null);
    try {
      const client = getClient();
      const date = BigInt(Math.floor(Date.now() / 1000));
      const tx = await client.add_expense({
        group_id: groupId,
        title,
        description,
        amount,
        paid_by: address,
        splits,
        category,
        date,
      });
      const result = await tx.signAndSend();

      setRpcTxHash(result.sendTransactionResponse?.hash || null);
      setRpcStatus("success");

      const newExpenseId = BigInt(result.result);
      await loadGroupDetails(groupId);
      return newExpenseId;
    } catch (err: any) {
      console.error("Failed to log expense:", err);
      setRpcStatus("failure");
      setContractError(err.message || "Failed to log expense on the ledger.");
      throw err;
    }
  };

  const addSettlement = async (
    groupId: bigint,
    receiver: string,
    amount: bigint,
    txHash: string
  ): Promise<bigint> => {
    if (!address) throw new Error("Wallet not connected");
    setRpcStatus("pending");
    setRpcTxHash(null);
    setContractError(null);
    try {
      const client = getClient();
      const date = BigInt(Math.floor(Date.now() / 1000));
      const tx = await client.add_settlement({
        group_id: groupId,
        sender: address,
        receiver,
        amount,
        tx_hash: txHash,
        date,
      });
      const result = await tx.signAndSend();

      setRpcTxHash(result.sendTransactionResponse?.hash || null);
      setRpcStatus("success");

      const newSettlementId = BigInt(result.result);
      await loadGroupDetails(groupId);
      return newSettlementId;
    } catch (err: any) {
      console.error("Failed to register settlement:", err);
      setRpcStatus("failure");
      setContractError(err.message || "Failed to log settlement on the ledger.");
      throw err;
    }
  };

  const pollEvents = useCallback(async () => {
    try {
      const rpcServer = new rpc.Server(RPC_URL);
      const latestLedger = await rpcServer.getLatestLedger();
      const latestSequence = latestLedger.sequence;

      if (lastSeenLedgerRef.current === 0) {
        lastSeenLedgerRef.current = latestSequence - 5;
      }

      if (latestSequence > lastSeenLedgerRef.current) {
        const start = lastSeenLedgerRef.current + 1;
        const end = latestSequence;

        const eventsResponse = await rpcServer.getEvents({
          startLedger: start,
          endLedger: end,
          filters: [
            {
              contractIds: [CONTRACT_ID],
              type: "contract",
            },
          ],
        });

        if (eventsResponse.events && eventsResponse.events.length > 0) {
          console.log(`Detected ${eventsResponse.events.length} new contract events!`);
          
          let shouldReloadGroups = false;
          let activeGroupToReload: bigint | null = null;
          const newActivityItems: ActivityFeedItem[] = [];

          eventsResponse.events.forEach((ev) => {
            try {
              const topics = ev.topic.map((t) => scValToNative(t));
              const eventType = topics[0];
              const parsedVal = scValToNative(ev.value);

              if (eventType === "group_cre") {
                shouldReloadGroups = true;
                const gid = BigInt(topics[1]);
                newActivityItems.push({
                  id: ev.id,
                  type: "group_created",
                  groupId: gid,
                  groupName: `Group #${gid}`,
                  timestamp: Date.now(),
                  details: `New group created by ${parsedVal.slice(0, 4)}...${parsedVal.slice(-4)}`,
                });
              } else if (eventType === "mbr_add") {
                const gid = BigInt(topics[1]);
                shouldReloadGroups = true;
                if (activeGroupIdRef.current === gid) {
                  activeGroupToReload = gid;
                }
                newActivityItems.push({
                  id: ev.id,
                  type: "member_added",
                  groupId: gid,
                  groupName: `Group #${gid}`,
                  timestamp: Date.now(),
                  details: `New member ${parsedVal.slice(0, 4)}...${parsedVal.slice(-4)} invited`,
                });
              } else if (eventType === "exp_add") {
                const gid = BigInt(topics[1]);
                if (activeGroupIdRef.current === gid) {
                  activeGroupToReload = gid;
                }
                newActivityItems.push({
                  id: ev.id,
                  type: "expense_added",
                  groupId: gid,
                  groupName: `Group #${gid}`,
                  timestamp: Date.now(),
                  details: `New expense of ${(Number(parsedVal) / 10000000).toFixed(2)} XLM added`,
                });
              } else if (eventType === "set_add") {
                const gid = BigInt(topics[1]);
                if (activeGroupIdRef.current === gid) {
                  activeGroupToReload = gid;
                }
                newActivityItems.push({
                  id: ev.id,
                  type: "settlement_added",
                  groupId: gid,
                  groupName: `Group #${gid}`,
                  timestamp: Date.now(),
                  details: `Settlement of ${(Number(parsedVal) / 10000000).toFixed(2)} XLM registered`,
                });
              }
            } catch (pErr) {
              console.error("Failed to parse event:", pErr);
            }
          });

          if (shouldReloadGroups) {
            await fetchUserGroups();
          }
          if (activeGroupToReload !== null) {
            await loadGroupDetails(activeGroupToReload);
          }
          if (newActivityItems.length > 0) {
            setActivityFeed((prev) => [...newActivityItems, ...prev].slice(0, 20));
          }
        }

        lastSeenLedgerRef.current = end;
      }
    } catch (err) {
      console.warn("Event polling error:", err);
    }
  }, [fetchUserGroups, loadGroupDetails]);

  useEffect(() => {
    if (isConnected) {
      fetchUserGroups();
      pollingIntervalRef.current = setInterval(pollEvents, 5000);
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    } else {
      setGroups([]);
      setActiveGroupDetails(null);
      setActivityFeed([]);
      lastSeenLedgerRef.current = 0;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }
  }, [isConnected, fetchUserGroups, pollEvents]);

  return (
    <ContractContext.Provider
      value={{
        groups,
        activeGroupDetails,
        isLoading,
        contractError,
        activityFeed,
        createGroup,
        addMember,
        addExpense,
        addSettlement,
        loadGroupDetails,
        fetchUserGroups,
        clearActiveGroup,
        rpcStatus,
        rpcTxHash,
      }}
    >
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => {
  const context = useContext(ContractContext);
  if (context === undefined) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
};
