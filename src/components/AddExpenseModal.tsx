import React, { useState, useEffect } from "react";
import { useContract } from "./ContractProvider";
import type { Split } from "./ContractProvider";
import { X, DollarSign, Loader2, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: bigint;
  members: string[];
}

const CATEGORIES = ["Food", "Travel", "Accommodation", "Entertainment", "Utilities", "Other"];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, groupId, members }) => {
  const { addExpense, rpcStatus, contractError } = useContract();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  
  // Custom split amounts entered as strings by the user
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initialize customShares mapping when members list changes
  useEffect(() => {
    const initialShares: Record<string, string> = {};
    members.forEach((m) => {
      initialShares[m] = "";
    });
    setCustomShares(initialShares);
  }, [members]);

  const xlmToStroops = (xlmVal: string | number): bigint => {
    return BigInt(Math.round(parseFloat(xlmVal.toString()) * 10000000));
  };

  const handleShareChange = (member: string, value: string) => {
    setCustomShares((prev) => ({
      ...prev,
      [member]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg("Expense title is required");
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg("Please enter a valid amount greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const totalStroops = xlmToStroops(amount);
      let splitsList: Split[] = [];

      if (splitType === "equal") {
        const numMembers = BigInt(members.length);
        const baseShare = totalStroops / numMembers;
        const remainder = totalStroops % numMembers;

        splitsList = members.map((m, idx) => ({
          member: m,
          // Add remainder to the first member to balance rounding
          amount: idx === 0 ? baseShare + remainder : baseShare,
        }));
      } else {
        // Custom split validation
        let sumStroops = 0n;
        const tempSplits: Split[] = [];

        for (const m of members) {
          const shareStr = customShares[m];
          const shareNum = parseFloat(shareStr || "0");
          if (isNaN(shareNum) || shareNum < 0) {
            throw new Error(`Invalid share amount for ${m.slice(0, 6)}`);
          }
          const shareStroops = xlmToStroops(shareStr || "0");
          sumStroops += shareStroops;
          tempSplits.push({
            member: m,
            amount: shareStroops,
          });
        }

        if (sumStroops !== totalStroops) {
          const difference = Number(totalStroops - sumStroops) / 10000000;
          throw new Error(
            `Sum of splits (${(Number(sumStroops) / 10000000).toFixed(
              2
            )} XLM) must equal the total amount (${amtNum.toFixed(2)} XLM). Difference: ${difference.toFixed(
              2
            )} XLM.`
          );
        }

        splitsList = tempSplits;
      }

      await addExpense(
        groupId,
        title.trim(),
        description.trim(),
        totalStroops,
        splitsList,
        category,
      );

      // Reset form
      setTitle("");
      setDescription("");
      setAmount("");
      setCategory("Food");
      setSplitType("equal");
      const clearedShares: Record<string, string> = {};
      members.forEach((m) => {
        clearedShares[m] = "";
      });
      setCustomShares(clearedShares);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to log expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-panel relative w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-white/10 my-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-100">Add an Expense</h3>
                <p className="text-xs text-gray-400">Log a shared bill. Freighter will sign the transaction.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. AWS Invoice, Dinner"
                    disabled={submitting}
                    className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Amount (XLM)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    disabled={submitting}
                    className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={submitting}
                    className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 focus:outline-none appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#1f2937] text-gray-100">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes"
                    disabled={submitting}
                    className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Split Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Split Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSplitType("equal")}
                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition ${
                      splitType === "equal"
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "border-white/5 bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Split Equally
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType("custom")}
                    className={`flex-1 py-2.5 rounded-2xl text-xs font-bold border transition ${
                      splitType === "custom"
                        ? "bg-purple-500/20 border-purple-500 text-purple-300"
                        : "border-white/5 bg-white/5 text-gray-400 hover:text-white"
                    }`}
                  >
                    Custom Split
                  </button>
                </div>
              </div>

              {/* Custom Split Inputs */}
              {splitType === "custom" && (
                <div className="p-4 bg-white/5 border border-white/5 rounded-3xl max-h-48 overflow-y-auto space-y-3">
                  <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5" /> Specify split shares (XLM)
                  </span>
                  {members.map((m) => (
                    <div key={m} className="flex items-center justify-between gap-4">
                      <span className="text-xs font-mono text-gray-400">
                        {truncateAddress(m)}
                      </span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={customShares[m] || ""}
                        onChange={(e) => handleShareChange(m, e.target.value)}
                        disabled={submitting}
                        className="w-32 glass-input px-3 py-1.5 rounded-xl text-xs text-gray-100 placeholder-gray-500 text-right focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Status / Errors */}
              {(errorMsg || contractError) && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400">
                  {errorMsg || contractError}
                </div>
              )}

              {rpcStatus === "pending" && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Stellar ledger...</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="glass-btn-primary px-5 py-2.5 rounded-2xl text-sm font-semibold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Submitting..." : "Add Expense"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
