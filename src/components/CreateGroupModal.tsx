import React, { useState } from "react";
import { useContract } from "./ContractProvider";
import { X, Users, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose }) => {
  const { createGroup, rpcStatus, contractError } = useContract();
  const [groupName, setGroupName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setErrorMsg("Group name is required");
      return;
    }
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await createGroup(groupName.trim());
      setGroupName("");
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to create group. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="glass-panel relative w-full max-w-md overflow-hidden rounded-3xl p-6 shadow-2xl border border-white/10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-100">Create a New Group</h3>
                <p className="text-xs text-gray-400">Organize expenses with startup squads, flatmates, or events.</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Hackathon Trippers, Cloud Server Split"
                  disabled={submitting}
                  className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Status / Errors */}
              {(errorMsg || contractError) && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400">
                  {errorMsg || contractError}
                </div>
              )}

              {rpcStatus === "pending" && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Awaiting wallet signature & ledger confirmation...</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 justify-end">
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
                  {submitting ? "Creating..." : "Create Group"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
