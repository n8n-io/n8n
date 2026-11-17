# Source: solution.md sections 1, 3.1, 3.2, 3.3, 3.5, 3.7 (instance credentials), 3.10 and 3.11.
Feature: Instance Promote
  An instance Promote selects every change of every team project of the
  environment that the user can promote. A dependency between two of these
  projects is in the same Promote. Gaps can still remain: a personal
  dependency, a move, and a dependency in a project outside the environment.
  A broken reference is a warning. An instance credential is a note.

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

    Scenario: A dependency in a team project outside the environment is a gap
      Given the environment covers the projects "Sales" and "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the user can access project "Ops"
      And the branch does not hold "Notify on-call"
      When the user opens the instance Promote dialog
      Then the dialog lists "Sync orders" with "Notify on-call" as a gap
      And the row says: "In a project that this environment does not cover."
      And the Promote does not write "Notify on-call" to the branch

    Scenario: An instance credential is a note
      Given "Sync orders" uses credential "Shared SMTP" with usage scope "instance"
      When the user opens the instance Promote dialog
      Then the dialog shows the note "An instance credential is not promoted. It must exist on the destination."
      And "Shared SMTP" is not a gap
      And the branch does not hold "Shared SMTP"

  Rule: The dialog lists each gap and each warning before the write to the branch

    Scenario: The list names the caller, the dependency, the reason and the fix
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And workflow "Daily report" of project "Ops" calls a workflow that does not exist on the source
      When the user opens the instance Promote dialog
      Then the dialog lists "Sync orders" with "Alice's token" as a gap
      And the row says: "This credential belongs to a personal project. Move it to a team project, then promote it from there."
      And the dialog lists "Daily report" with the missing workflow as a warning
      And the Promote writes nothing to the branch before the user sees the list

  Rule: On a strict environment a personal dependency stops the whole instance Promote

    Scenario: A team workflow uses a personal credential
      Given the promote environment is strict
      And "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user starts an instance Promote
      Then the Promote stops
      And the branch does not change
      And the Promote names "Sync orders", "Alice's token" and the fix

    Scenario: A team workflow calls a personal workflow
      Given the promote environment is strict
      And "Sync orders" calls workflow "Alice's helper" of the personal project of Alice
      When the user starts an instance Promote
      Then the Promote stops
      And the branch does not change
      And the Promote names "Sync orders", "Alice's helper" and the fix

    Scenario: The instance Promote passes after the dependency moves to a team project
      Given the promote environment is strict
      And "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And Alice moved "Alice's token" to project "Sales" in the editor
      When the user starts an instance Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Alice's token" to the branch under project "Sales"

  Rule: With "allow incomplete", the user can confirm the gaps of an instance Promote

    Scenario: The instance Promote continues after the user confirms
      Given "Allow incomplete promotions" is on for the promote environment
      And "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user confirms the gaps and starts an instance Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the branch does not hold "Alice's token"

  Rule: A reference to a workflow that does not exist is a warning

    Scenario: A team workflow calls a deleted workflow
      Given "Sync orders" calls a workflow that does not exist on the source
      When the user starts an instance Promote
      Then the Promote shows a warning that names "Sync orders" and the broken reference
      And the Promote writes "Sync orders" to the branch under project "Sales"
