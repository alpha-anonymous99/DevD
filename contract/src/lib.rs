#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Split {
    pub member: Address,
    pub amount: u64, // Stroops
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Group {
    pub id: u64,
    pub name: String,
    pub creator: Address,
    pub members: Vec<Address>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Expense {
    pub id: u64,
    pub group_id: u64,
    pub title: String,
    pub description: String,
    pub amount: u64,
    pub paid_by: Address,
    pub splits: Vec<Split>,
    pub category: String,
    pub date: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub id: u64,
    pub group_id: u64,
    pub sender: Address,
    pub receiver: Address,
    pub amount: u64,
    pub tx_hash: String,
    pub date: u64,
}

#[contracttype]
pub enum DataKey {
    GroupCount,                  // u64
    Group(u64),                  // Group
    ExpenseCount,                // u64
    Expense(u64),                // Expense
    SettlementCount,             // u64
    Settlement(u64),             // Settlement
    GroupExpenses(u64),          // Vec<u64> (Expense IDs)
    GroupSettlements(u64),       // Vec<u64> (Settlement IDs)
    UserGroups(Address),         // Vec<u64> (Group IDs)
}

#[contract]
pub struct DevDContract;

#[contractimpl]
impl DevDContract {
    pub fn create_group(env: Env, creator: Address, name: String) -> u64 {
        // Authenticate creator
        creator.require_auth();

        let mut count: u64 = env.storage().persistent().get(&DataKey::GroupCount).unwrap_or(0);
        count += 1;
        env.storage().persistent().set(&DataKey::GroupCount, &count);

        let mut members = Vec::new(&env);
        members.push_back(creator.clone());

        let group = Group {
            id: count,
            name: name.clone(),
            creator: creator.clone(),
            members,
        };

        env.storage().persistent().set(&DataKey::Group(count), &group);

        // Add to user groups
        let mut user_groups: Vec<u64> = env.storage().persistent().get(&DataKey::UserGroups(creator.clone())).unwrap_or(Vec::new(&env));
        user_groups.push_back(count);
        env.storage().persistent().set(&DataKey::UserGroups(creator.clone()), &user_groups);

        // Emit event
        env.events().publish(
            (symbol_short!("group_cre"), count),
            creator
        );

        count
    }

    pub fn add_member(env: Env, group_id: u64, member: Address) {
        // Fetch group
        let group_key = DataKey::Group(group_id);
        let mut group: Group = env.storage().persistent().get(&group_key).unwrap_or_else(|| panic!("Group not found"));

        // Authenticate group creator to add member
        group.creator.require_auth();

        // Check if member already in group
        let mut exists = false;
        for i in 0..group.members.len() {
            if group.members.get(i).unwrap() == member {
                exists = true;
                break;
            }
        }

        if !exists {
            group.members.push_back(member.clone());
            env.storage().persistent().set(&group_key, &group);

            // Add to user groups
            let mut user_groups: Vec<u64> = env.storage().persistent().get(&DataKey::UserGroups(member.clone())).unwrap_or(Vec::new(&env));
            user_groups.push_back(group_id);
            env.storage().persistent().set(&DataKey::UserGroups(member.clone()), &user_groups);

            // Emit event
            env.events().publish(
                (symbol_short!("mbr_add"), group_id),
                member
            );
        }
    }

    pub fn add_expense(
        env: Env,
        group_id: u64,
        title: String,
        description: String,
        amount: u64,
        paid_by: Address,
        splits: Vec<Split>,
        category: String,
        date: u64,
    ) -> u64 {
        // Authenticate the payer
        paid_by.require_auth();

        // Check if group exists
        let group_key = DataKey::Group(group_id);
        let _group: Group = env.storage().persistent().get(&group_key).unwrap_or_else(|| panic!("Group not found"));

        let mut count: u64 = env.storage().persistent().get(&DataKey::ExpenseCount).unwrap_or(0);
        count += 1;
        env.storage().persistent().set(&DataKey::ExpenseCount, &count);

        let expense = Expense {
            id: count,
            group_id,
            title: title.clone(),
            description: description.clone(),
            amount,
            paid_by: paid_by.clone(),
            splits,
            category: category.clone(),
            date,
        };

        env.storage().persistent().set(&DataKey::Expense(count), &expense);

        // Add to group expenses list
        let mut group_expenses: Vec<u64> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap_or(Vec::new(&env));
        group_expenses.push_back(count);
        env.storage().persistent().set(&DataKey::GroupExpenses(group_id), &group_expenses);

        // Emit event
        env.events().publish(
            (symbol_short!("exp_add"), group_id, count),
            amount
        );

        count
    }

    pub fn add_settlement(
        env: Env,
        group_id: u64,
        sender: Address,
        receiver: Address,
        amount: u64,
        tx_hash: String,
        date: u64,
    ) -> u64 {
        // Authenticate the sender
        sender.require_auth();

        // Check if group exists
        let group_key = DataKey::Group(group_id);
        let _group: Group = env.storage().persistent().get(&group_key).unwrap_or_else(|| panic!("Group not found"));

        let mut count: u64 = env.storage().persistent().get(&DataKey::SettlementCount).unwrap_or(0);
        count += 1;
        env.storage().persistent().set(&DataKey::SettlementCount, &count);

        let settlement = Settlement {
            id: count,
            group_id,
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount,
            tx_hash,
            date,
        };

        env.storage().persistent().set(&DataKey::Settlement(count), &settlement);

        // Add to group settlements list
        let mut group_settlements: Vec<u64> = env.storage().persistent().get(&DataKey::GroupSettlements(group_id)).unwrap_or(Vec::new(&env));
        group_settlements.push_back(count);
        env.storage().persistent().set(&DataKey::GroupSettlements(group_id), &group_settlements);

        // Emit event
        env.events().publish(
            (symbol_short!("set_add"), group_id, count),
            amount
        );

        count
    }

    pub fn get_group(env: Env, group_id: u64) -> Group {
        let group_key = DataKey::Group(group_id);
        env.storage().persistent().get(&group_key).unwrap_or_else(|| panic!("Group not found"))
    }

    pub fn get_group_members(env: Env, group_id: u64) -> Vec<Address> {
        let group = Self::get_group(env, group_id);
        group.members
    }

    pub fn get_group_expenses(env: Env, group_id: u64) -> Vec<Expense> {
        let expense_ids: Vec<u64> = env.storage().persistent().get(&DataKey::GroupExpenses(group_id)).unwrap_or(Vec::new(&env));
        let mut expenses = Vec::new(&env);
        for i in 0..expense_ids.len() {
            let id = expense_ids.get(i).unwrap();
            let expense: Expense = env.storage().persistent().get(&DataKey::Expense(id)).unwrap();
            expenses.push_back(expense);
        }
        expenses
    }

    pub fn get_group_settlements(env: Env, group_id: u64) -> Vec<Settlement> {
        let settlement_ids: Vec<u64> = env.storage().persistent().get(&DataKey::GroupSettlements(group_id)).unwrap_or(Vec::new(&env));
        let mut settlements = Vec::new(&env);
        for i in 0..settlement_ids.len() {
            let id = settlement_ids.get(i).unwrap();
            let settlement: Settlement = env.storage().persistent().get(&DataKey::Settlement(id)).unwrap();
            settlements.push_back(settlement);
        }
        settlements
    }

    pub fn get_user_groups(env: Env, user: Address) -> Vec<Group> {
        let group_ids: Vec<u64> = env.storage().persistent().get(&DataKey::UserGroups(user)).unwrap_or(Vec::new(&env));
        let mut groups = Vec::new(&env);
        for i in 0..group_ids.len() {
            let id = group_ids.get(i).unwrap();
            let group_key = DataKey::Group(id);
            if let Some(group) = env.storage().persistent().get::<DataKey, Group>(&group_key) {
                groups.push_back(group);
            }
        }
        groups
    }
}

#[cfg(test)]
mod test;
