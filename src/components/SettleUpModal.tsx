import React, { useState } from "react";
import { useWallet } from "./WalletProvider";
import { useContract } from "./ContractProvider";
import { X, Send, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TransactionBuilder, Operation, Asset, BASE_FEE } from "@stellar/stellar-sdk";
import { Horizon } from "@stellar/stellar-sdk";

interface SettleUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: bigint;
  suggestedDebts: Array<{ from: string; to: string; amount: bigint }>;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  onClose,
  groupId,
  suggestedDebts,
}) => {
  const { address, signTx, refreshBalance } = useWallet();
  const { addSettlement, contractError } = useContract();

  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  
  // Pipeline status tracking
  const [step, setStep] = useState<"idle" | "payment" | "contract" | "completed">("idle");
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const myDebts = suggestedDebts.filter((d) => d.from.toLowerCase() === address?.toLowerCase());

  const handleSelectDebt = (to: string, amtStroops: bigint) => {
    setReceiver(to);
    setAmount((Number(amtStroops) / 10000000).toString());
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!address) {
      setErrorMsg("Wallet not connected");
      return;
    }
    if (!receiver.trim()) {
      setErrorMsg("Receiver address is required");
      return;
    }
    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg("Enter a valid XLM amount to settle");
      return;
    }

    try {
      // --- STEP 1: NATIVE XLM PAYMENT ---
      setStep("payment");
      const horizonUrl = "https://horizon-testnet.stellar.org";
      const horizon = new Horizon.Server(horizonUrl);
      
      // Load source account details to get current sequence number
      const sourceAccount = await horizon.loadAccount(address);
      
      // Build transaction for native payment
      const tx = new TransactionBuilder(sourceAccount, {
        fee: BASE_FEE,
        networkPassphrase: "Test SDF Network ; September 2015",
      })
      .addOperation(
        Operation.payment({
          destination: receiver.trim(),
          asset: Asset.native(),
          amount: amtNum.toFixed(7), // Stellar requires 7 decimal places string
        })
      )
      .setTimeout(30)
      .build();

      // Sign transaction via wallet
      const signedXdr = await signTx(tx.toXDR());
      
      // Submit native payment to Horizon
      const signedTx = TransactionBuilder.fromXDR(signedXdr, "Test SDF Network ; September 2015");
      const paymentResponse = await horizon.submitTransaction(signedTx);
      const hash = paymentResponse.hash;
      setPaymentTxHash(hash);

      // --- STEP 2: LOG RECORD ON SMART CONTRACT ---
      setStep("contract");
      const amountStroops = BigInt(Math.round(amtNum * 10000000));
      await addSettlement(groupId, receiver.trim(), amountStroops, hash);

      // --- SUCCESS ---
      setStep("completed");
      await refreshBalance();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Settlement pipeline failed.");
      setStep("idle");
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            className="glass-panel relative w-full max-w-md rounded-3xl p-6 shadow-2xl border border-white/10"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-xl">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-100">Settle Up Debt</h3>
                <p className="text-xs text-gray-400">Instantly transfer XLM and log proof on-chain.</p>
              </div>
            </div>

            {step === "completed" ? (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center border border-green-500/30">
                  <CheckCircle2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-gray-100">Debt Successfully Settled!</h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Payment sent and receipt registered on the smart contract.
                  </p>
                </div>
                {paymentTxHash && (
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-left">
                    <span className="text-[10px] uppercase font-semibold text-gray-500 block mb-1">
                      Payment Transaction
                    </span>
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${paymentTxHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:underline break-all font-mono"
                    >
                      {paymentTxHash}
                    </a>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="glass-btn-primary w-full py-2.5 rounded-2xl text-sm font-semibold text-white cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSettle} className="space-y-4">
                {/* Suggested Debts */}
                {myDebts.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-gray-500">
                      Suggested settlements (You Owe)
                    </span>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {myDebts.map((d, i) => (
                        <div
                          key={i}
                          onClick={() => handleSelectDebt(d.to, d.amount)}
                          className="flex items-center justify-between p-2.5 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/30 rounded-2xl cursor-pointer transition"
                        >
                          <div className="flex items-center gap-2 text-xs font-medium text-gray-300">
                            <span>You</span>
                            <ArrowRight className="w-3 h-3 text-purple-400" />
                            <span className="font-mono text-purple-200">
                              {truncateAddress(d.to)}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-purple-300 font-mono">
                            {(Number(d.amount) / 10000000).toFixed(2)} XLM
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Payee Address
                    </label>
                    <input
                      type="text"
                      value={receiver}
                      onChange={(e) => setReceiver(e.target.value)}
                      placeholder="G..."
                      disabled={step !== "idle"}
                      className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Settle Amount (XLM)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={step !== "idle"}
                      className="w-full glass-input px-4 py-3 rounded-2xl text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Pipeline statuses */}
                {step === "payment" && (
                  <div className="flex items-center gap-2.5 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Step 1: Sending XLM payment via Freighter...</span>
                  </div>
                )}

                {step === "contract" && (
                  <div className="flex items-center gap-2.5 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-xs text-purple-300">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Step 2: Recording settlement proof on ledger...</span>
                  </div>
                )}

                {(errorMsg || contractError) && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-400">
                    {errorMsg || contractError}
                  </div>
                )}

                <div className="flex items-center gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={step !== "idle"}
                    className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-400 hover:text-white hover:bg-white/5 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={step !== "idle"}
                    className="glass-btn-primary px-5 py-2.5 rounded-2xl text-sm font-semibold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {step !== "idle" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {step !== "idle" ? "Processing..." : "Settle Now"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
