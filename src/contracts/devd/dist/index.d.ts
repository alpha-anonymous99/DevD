import { Buffer } from "buffer";
import { AssembledTransaction, Client as ContractClient, ClientOptions as ContractClientOptions, MethodOptions } from "@stellar/stellar-sdk/contract";
import type { u64 } from "@stellar/stellar-sdk/contract";
export * from "@stellar/stellar-sdk";
export * as contract from "@stellar/stellar-sdk/contract";
export * as rpc from "@stellar/stellar-sdk/rpc";
export declare const networks: {
    readonly testnet: {
        readonly networkPassphrase: "Test SDF Network ; September 2015";
        readonly contractId: "CDKCOKAMDDJIXHFTTVUY5GJPZRCC5645NKZ544WPI253RMYFXFH7T4KI";
    };
};
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
export type DataKey = {
    tag: "GroupCount";
    values: void;
} | {
    tag: "Group";
    values: readonly [u64];
} | {
    tag: "ExpenseCount";
    values: void;
} | {
    tag: "Expense";
    values: readonly [u64];
} | {
    tag: "SettlementCount";
    values: void;
} | {
    tag: "Settlement";
    values: readonly [u64];
} | {
    tag: "GroupExpenses";
    values: readonly [u64];
} | {
    tag: "GroupSettlements";
    values: readonly [u64];
} | {
    tag: "UserGroups";
    values: readonly [string];
};
export interface Client {
    /**
     * Construct and simulate a create_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    create_group: ({ creator, name }: {
        creator: string;
        name: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u64>>;
    /**
     * Construct and simulate a add_member transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    add_member: ({ group_id, member }: {
        group_id: u64;
        member: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<null>>;
    /**
     * Construct and simulate a add_expense transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    add_expense: ({ group_id, title, description, amount, paid_by, splits, category, date }: {
        group_id: u64;
        title: string;
        description: string;
        amount: u64;
        paid_by: string;
        splits: Array<Split>;
        category: string;
        date: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u64>>;
    /**
     * Construct and simulate a add_settlement transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    add_settlement: ({ group_id, sender, receiver, amount, tx_hash, date }: {
        group_id: u64;
        sender: string;
        receiver: string;
        amount: u64;
        tx_hash: string;
        date: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<u64>>;
    /**
     * Construct and simulate a get_group transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_group: ({ group_id }: {
        group_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Group>>;
    /**
     * Construct and simulate a get_group_members transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_group_members: ({ group_id }: {
        group_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Array<string>>>;
    /**
     * Construct and simulate a get_group_expenses transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_group_expenses: ({ group_id }: {
        group_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Array<Expense>>>;
    /**
     * Construct and simulate a get_group_settlements transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_group_settlements: ({ group_id }: {
        group_id: u64;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Array<Settlement>>>;
    /**
     * Construct and simulate a get_user_groups transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
     */
    get_user_groups: ({ user }: {
        user: string;
    }, options?: MethodOptions) => Promise<AssembledTransaction<Array<Group>>>;
}
export declare class Client extends ContractClient {
    readonly options: ContractClientOptions;
    static deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions & Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
    }): Promise<AssembledTransaction<T>>;
    constructor(options: ContractClientOptions);
    readonly fromJSON: {
        create_group: (json: string) => AssembledTransaction<bigint>;
        add_member: (json: string) => AssembledTransaction<null>;
        add_expense: (json: string) => AssembledTransaction<bigint>;
        add_settlement: (json: string) => AssembledTransaction<bigint>;
        get_group: (json: string) => AssembledTransaction<Group>;
        get_group_members: (json: string) => AssembledTransaction<string[]>;
        get_group_expenses: (json: string) => AssembledTransaction<Expense[]>;
        get_group_settlements: (json: string) => AssembledTransaction<Settlement[]>;
        get_user_groups: (json: string) => AssembledTransaction<Group[]>;
    };
}
