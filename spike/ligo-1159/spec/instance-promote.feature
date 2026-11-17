# Source: solution.md sections 1, 3, 4.2, 4.4, 5.7 and 6.1.
Feature: Instance Promote
  An instance Promote carries all team projects. A dependency between two
  team projects is always in the same Promote. Only a personal dependency or a
  move can stop the Promote. A broken reference is a warning.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" is in project "Sales" on the source

  Rule: An instance Promote writes all team projects together

    Scenario: A dependency between two team projects passes
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch is empty
      When the user starts an instance Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "CRM key" to the branch under project "Platform"
      And the Promote writes "Notify on-call" to the branch under project "Ops"

    Scenario: A personal project is never content
      Given Alice has workflow "Alice's helper" in a personal project
      When the user starts an instance Promote
      Then the branch does not hold "Alice's helper"
      And the branch holds no folder for the personal project of Alice

  Rule: The dialog lists each dependency problem before the write to the branch

    Scenario: The list names the caller, the dependency, the reason and the fix
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And workflow "Daily report" of project "Ops" calls a workflow that does not exist on the source
      When the user opens the instance Promote dialog
      Then the dialog lists "Sync orders" with "Alice's token" as a block
      And the row says: "This credential belongs to a personal project. Move it to a team project, then promote it from there."
      And the dialog lists "Daily report" with the missing workflow as a warning
      And the Promote writes nothing to the branch before the user sees the list

  Rule: A personal dependency stops the whole instance Promote

    @open-decision-1
    Scenario: A team workflow uses a personal credential
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user starts an instance Promote
      Then the Promote stops
      And the branch does not change
      And the Promote names "Sync orders", "Alice's token" and the fix

    @open-decision-1
    Scenario: A team workflow calls a personal workflow
      Given "Sync orders" calls workflow "Alice's helper" of the personal project of Alice
      When the user starts an instance Promote
      Then the Promote stops
      And the branch does not change
      And the Promote names "Sync orders", "Alice's helper" and the fix

    Scenario: The instance Promote passes after the dependency moves to a team project
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And Alice moved "Alice's token" to project "Sales" in the editor
      When the user starts an instance Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Alice's token" to the branch under project "Sales"

  Rule: A reference to a workflow that does not exist is a warning

    @open-decision-10
    Scenario: A team workflow calls a deleted workflow
      Given "Sync orders" calls a workflow that does not exist on the source
      When the user starts an instance Promote
      Then the Promote shows a warning that names "Sync orders" and the broken reference
      And the Promote writes "Sync orders" to the branch under project "Sales"
