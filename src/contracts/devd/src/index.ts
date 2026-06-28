import { Buffer } from "buffer";
import { Address } from "@stellar/stellar-sdk";
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Timepoint,
  Duration,
} from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";

if (typeof window !== "undefined") {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CDKCOKAMDDJIXHFTTVUY5GJPZRCC5645NKZ544WPI253RMYFXFH7T4KI",
  }
} as const


export interface Split {
  amount: u64;
  member: string;
}


export interface Group {
  creator: string;
  id: u64;
  members: Array<string>;
  name: string;
}


export interface Expense {
  amount: u64;
  category: string;
  date: u64;
  description: string;
  group_id: u64;
  id: u64;
  paid_by: string;
  splits: Array<Split>;
  title: string;
}


export interface Settlement {
  amount: u64;
  date: u64;
  group_id: u64;
  id: u64;
  receiver: string;
  sender: string;
  tx_hash: string;
}

export type DataKey = {tag: "GroupCount", values: void} | {tag: "Group", values: readonly [u64]} | {tag: "ExpenseCount", values: void} | {tag: "Expense", values: readonly [u64]} | {tag: "SettlementCount", values: void} | {tag: "Settlement", values: readonly [u64]} | {tag: "GroupExpenses", values: readonly [u64]} | {tag: "GroupSettlements", values: readonly [u64]} | {tag: "UserGroups", values: readonly [string]};

export interface Client {
  /**
   * Construct and simulate a create_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  create_group: ({creator, name}: {creator: string, name: string}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a add_member transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_member: ({group_id, member}: {group_id: u64, member: string}, options?: MethodOptions) => Promise<AssembledTransaction<null>>

  /**
   * Construct and simulate a add_expense transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_expense: ({group_id, title, description, amount, paid_by, splits, category, date}: {group_id: u64, title: string, description: string, amount: u64, paid_by: string, splits: Array<Split>, category: string, date: u64}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a add_settlement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  add_settlement: ({group_id, sender, receiver, amount, tx_hash, date}: {group_id: u64, sender: string, receiver: string, amount: u64, tx_hash: string, date: u64}, options?: MethodOptions) => Promise<AssembledTransaction<u64>>

  /**
   * Construct and simulate a get_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_group: ({group_id}: {group_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Group>>

  /**
   * Construct and simulate a get_group_members transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_group_members: ({group_id}: {group_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>

  /**
   * Construct and simulate a get_group_expenses transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_group_expenses: ({group_id}: {group_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Expense>>>

  /**
   * Construct and simulate a get_group_settlements transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_group_settlements: ({group_id}: {group_id: u64}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Settlement>>>

  /**
   * Construct and simulate a get_user_groups transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_user_groups: ({user}: {user: string}, options?: MethodOptions) => Promise<AssembledTransaction<Array<Group>>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAQAAAAAAAAAAAAAABVNwbGl0AAAAAAAAAgAAAAAAAAAGYW1vdW50AAAAAAAGAAAAAAAAAAZtZW1iZXIAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAABUdyb3VwAAAAAAAABAAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAAJpZAAAAAAABgAAAAAAAAAHbWVtYmVycwAAAAPqAAAAEwAAAAAAAAAEbmFtZQAAABA=",
        "AAAAAQAAAAAAAAAAAAAAB0V4cGVuc2UAAAAACQAAAAAAAAAGYW1vdW50AAAAAAAGAAAAAAAAAAhjYXRlZ29yeQAAABAAAAAAAAAABGRhdGUAAAAGAAAAAAAAAAtkZXNjcmlwdGlvbgAAAAAQAAAAAAAAAAhncm91cF9pZAAAAAYAAAAAAAAAAmlkAAAAAAAGAAAAAAAAAAdwYWlkX2J5AAAAABMAAAAAAAAABnNwbGl0cwAAAAAD6gAAB9AAAAAFU3BsaXQAAAAAAAAAAAAABXRpdGxlAAAAAAAAEA==",
        "AAAAAQAAAAAAAAAAAAAAClNldHRsZW1lbnQAAAAAAAcAAAAAAAAABmFtb3VudAAAAAAABgAAAAAAAAAEZGF0ZQAAAAYAAAAAAAAACGdyb3VwX2lkAAAABgAAAAAAAAACaWQAAAAAAAYAAAAAAAAACHJlY2VpdmVyAAAAEwAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAAAd0eF9oYXNoAAAAABA=",
        "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAACQAAAAAAAAAAAAAACkdyb3VwQ291bnQAAAAAAAEAAAAAAAAABUdyb3VwAAAAAAAAAQAAAAYAAAAAAAAAAAAAAAxFeHBlbnNlQ291bnQAAAABAAAAAAAAAAdFeHBlbnNlAAAAAAEAAAAGAAAAAAAAAAAAAAAPU2V0dGxlbWVudENvdW50AAAAAAEAAAAAAAAAClNldHRsZW1lbnQAAAAAAAEAAAAGAAAAAQAAAAAAAAANR3JvdXBFeHBlbnNlcwAAAAAAAAEAAAAGAAAAAQAAAAAAAAAQR3JvdXBTZXR0bGVtZW50cwAAAAEAAAAGAAAAAQAAAAAAAAAKVXNlckdyb3VwcwAAAAAAAQAAABM=",
        "AAAAAAAAAAAAAAAMY3JlYXRlX2dyb3VwAAAAAgAAAAAAAAAHY3JlYXRvcgAAAAATAAAAAAAAAARuYW1lAAAAEAAAAAEAAAAG",
        "AAAAAAAAAAAAAAAKYWRkX21lbWJlcgAAAAAAAgAAAAAAAAAIZ3JvdXBfaWQAAAAGAAAAAAAAAAZtZW1iZXIAAAAAABMAAAAA",
        "AAAAAAAAAAAAAAALYWRkX2V4cGVuc2UAAAAACAAAAAAAAAAIZ3JvdXBfaWQAAAAGAAAAAAAAAAV0aXRsZQAAAAAAABAAAAAAAAAAC2Rlc2NyaXB0aW9uAAAAABAAAAAAAAAABmFtb3VudAAAAAAABgAAAAAAAAAHcGFpZF9ieQAAAAATAAAAAAAAAAZzcGxpdHMAAAAAA+oAAAfQAAAABVNwbGl0AAAAAAAAAAAAAAhjYXRlZ29yeQAAABAAAAAAAAAABGRhdGUAAAAGAAAAAQAAAAY=",
        "AAAAAAAAAAAAAAAOYWRkX3NldHRsZW1lbnQAAAAAAAYAAAAAAAAACGdyb3VwX2lkAAAABgAAAAAAAAAGc2VuZGVyAAAAAAATAAAAAAAAAAhyZWNlaXZlcgAAABMAAAAAAAAABmFtb3VudAAAAAAABgAAAAAAAAAHdHhfaGFzaAAAAAAQAAAAAAAAAARkYXRlAAAABgAAAAEAAAAG",
        "AAAAAAAAAAAAAAAJZ2V0X2dyb3VwAAAAAAAAAQAAAAAAAAAIZ3JvdXBfaWQAAAAGAAAAAQAAB9AAAAAFR3JvdXAAAAA=",
        "AAAAAAAAAAAAAAARZ2V0X2dyb3VwX21lbWJlcnMAAAAAAAABAAAAAAAAAAhncm91cF9pZAAAAAYAAAABAAAD6gAAABM=",
        "AAAAAAAAAAAAAAASZ2V0X2dyb3VwX2V4cGVuc2VzAAAAAAABAAAAAAAAAAhncm91cF9pZAAAAAYAAAABAAAD6gAAB9AAAAAHRXhwZW5zZQA=",
        "AAAAAAAAAAAAAAAVZ2V0X2dyb3VwX3NldHRsZW1lbnRzAAAAAAAAAQAAAAAAAAAIZ3JvdXBfaWQAAAAGAAAAAQAAA+oAAAfQAAAAClNldHRsZW1lbnQAAA==",
        "AAAAAAAAAAAAAAAPZ2V0X3VzZXJfZ3JvdXBzAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAfQAAAABUdyb3VwAAAA" ]),
      options
    )
  }
  public readonly fromJSON = {
    create_group: this.txFromJSON<u64>,
        add_member: this.txFromJSON<null>,
        add_expense: this.txFromJSON<u64>,
        add_settlement: this.txFromJSON<u64>,
        get_group: this.txFromJSON<Group>,
        get_group_members: this.txFromJSON<Array<string>>,
        get_group_expenses: this.txFromJSON<Array<Expense>>,
        get_group_settlements: this.txFromJSON<Array<Settlement>>,
        get_user_groups: this.txFromJSON<Array<Group>>
  }
}