#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn test_devd_flow() {
    let env = Env::default();
    env.mock_all_auths();

    // Register contract
    let contract_id = env.register_contract(None, DevDContract);
    let client = DevDContractClient::new(&env, &contract_id);

    // Create test accounts
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    let charlie = Address::generate(&env);

    // Create a group
    let group_name = String::from_str(&env, "Hackathon Squad");
    let group_id = client.create_group(&alice, &group_name);
    assert_eq!(group_id, 1);

    // Add Bob and Charlie
    client.add_member(&group_id, &bob);
    client.add_member(&group_id, &charlie);

    // Fetch members and check
    let members = client.get_group_members(&group_id);
    assert_eq!(members.len(), 3);
    assert_eq!(members.get(0).unwrap(), alice);
    assert_eq!(members.get(1).unwrap(), bob);
    assert_eq!(members.get(2).unwrap(), charlie);

    // Add an expense: Alice paid 150 stroops, split equally between Alice, Bob, and Charlie
    let splits = soroban_sdk::vec![
        &env,
        Split { member: alice.clone(), amount: 50 },
        Split { member: bob.clone(), amount: 50 },
        Split { member: charlie.clone(), amount: 50 }
    ];

    let expense_id = client.add_expense(
        &group_id,
        &String::from_str(&env, "Pizza & Drinks"),
        &String::from_str(&env, "Split equally"),
        &150,
        &alice,
        &splits,
        &String::from_str(&env, "Food"),
        &1719540000
    );
    assert_eq!(expense_id, 1);

    // Get group expenses
    let expenses = client.get_group_expenses(&group_id);
    assert_eq!(expenses.len(), 1);
    let exp = expenses.get(0).unwrap();
    assert_eq!(exp.amount, 150);
    assert_eq!(exp.paid_by, alice);

    // Bob settles up: Bob pays Alice 50 stroops
    let tx_hash = String::from_str(&env, "tx_hash_bob_alice_50");
    let settlement_id = client.add_settlement(
        &group_id,
        &bob,
        &alice,
        &50,
        &tx_hash,
        &1719542000
    );
    assert_eq!(settlement_id, 1);

    // Get settlements
    let settlements = client.get_group_settlements(&group_id);
    assert_eq!(settlements.len(), 1);
    let set = settlements.get(0).unwrap();
    assert_eq!(set.amount, 50);
    assert_eq!(set.sender, bob);
    assert_eq!(set.receiver, alice);

    // Fetch user groups for Bob
    let bob_groups = client.get_user_groups(&bob);
    assert_eq!(bob_groups.len(), 1);
    assert_eq!(bob_groups.get(0).unwrap().id, group_id);
}
