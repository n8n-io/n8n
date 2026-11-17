# Source: solution.md sections 3.2, 3.4 ("Deletions") and 3.9, and open
# decision 8 of section 9.
Feature: Guards against deletion on Apply
  Apply does not delete a resource that the applied workflows still need, and
  it reports a deletion that breaks a caller on the destination. Apply checks
  deletions in this order: a deletion in the selection that an item of the
  same Apply references, a workflow that an instance Apply keeps, and the
  callers on the destination.

  Rule: A deletion in the selection that an item of the same Apply references is a gap

    Background:
      Given the destination holds workflow "Notify on-call" in project "Ops"
      And the branch does not hold "Notify on-call"
      And the branch holds workflow "Sync orders" under project "Sales"
      And "Sync orders" calls "Notify on-call"
      And the user can apply the projects "Sales" and "Ops"
      And the apply environment is strict

    Scenario: The selection deletes a workflow that an item of the same Apply calls
      Given the selection of the Apply writes "Sync orders" and deletes "Notify on-call"
      When the user applies the selection
      Then the Apply stops before any write
      And the report shows a gap: "Sync orders" references "Notify on-call", which this Apply deletes
      And the gap offers the fix "Remove the deletion from the selection"

    Scenario: The user removes the deletion from the selection
      Given the selection of the Apply writes "Sync orders" and deletes "Notify on-call"
      When the user removes the deletion of "Notify on-call" from the selection
      And the user applies the selection
      Then the Apply imports "Sync orders"
      And the destination still holds "Notify on-call" in project "Ops"

  Rule: Apply lists the destination callers of a workflow that it deletes

    Scenario: A workflow on the destination calls a workflow that the Apply deletes
      Given the destination holds workflow "Notify on-call" in project "Ops"
      And the destination holds workflow "Legacy alert" in project "Support"
      And "Legacy alert" calls "Notify on-call"
      And the user can access project "Support"
      And this Apply deletes "Notify on-call" and does not write "Legacy alert"
      When the user applies project "Ops"
      Then the Apply stops before any write
      And the Apply lists "Legacy alert" in project "Support" as a caller of "Notify on-call"

    Scenario: A caller that the user cannot access is a count
      Given the destination holds workflow "Notify on-call" in project "Ops"
      And the destination holds workflow "Legacy alert" in project "Support"
      And "Legacy alert" calls "Notify on-call"
      And the user cannot access project "Support"
      And this Apply deletes "Notify on-call" and does not write "Legacy alert"
      When the user applies project "Ops"
      Then the Apply stops before any write
      And the Apply says: "1 workflow that you cannot access calls it."
      And the Apply does not name "Legacy alert" or project "Support"

    Scenario: The user accepts the broken callers
      Given the Apply lists "Legacy alert" as a caller of the deleted workflow "Notify on-call"
      When the user accepts and continues
      Then the Apply deletes "Notify on-call"
      And "Legacy alert" has a broken reference on the destination

    Scenario: The user cancels
      Given the Apply lists "Legacy alert" as a caller of the deleted workflow "Notify on-call"
      When the user cancels
      Then the destination does not change

    @open-decision-8
    Scenario: The deletion check reads the published version of a caller
      Given the destination holds workflow "Notify on-call" in project "Ops"
      And the destination holds workflow "Daily report" in project "Sales"
      And the published version of "Daily report" calls "Notify on-call"
      And the branch holds a version of "Daily report" that does not call "Notify on-call"
      And the user can access project "Sales"
      And this Apply writes "Daily report" and deletes "Notify on-call"
      When the user applies the selection
      Then the Apply stops before any write
      And the Apply lists "Daily report" in project "Sales" as a caller of "Notify on-call"

  Rule: An instance Apply keeps a project that owns a credential that the package uses

    Scenario: The package lacks a project whose credential a package workflow uses
      Given the destination holds credential "CRM key" in project "Platform"
      And the branch holds workflow "Sync orders" under project "Sales"
      And "Sync orders" uses "CRM key"
      And the branch does not hold project "Platform"
      When the user starts an instance Apply
      Then the Apply does not delete project "Platform"
      And the Apply shows a warning that names project "Platform" and "CRM key"

  Rule: Reconciliation keeps a workflow that a workflow of the package references

    Scenario: The caller is in another project of the package
      Given the branch holds workflow "Sync orders" under project "Sales"
      And the branch holds project "Ops" without workflow "Notify on-call"
      And "Sync orders" calls "Notify on-call"
      And the destination holds "Notify on-call" in project "Ops"
      When the user starts an instance Apply
      Then the Apply does not delete "Notify on-call"
      And the result lists "Notify on-call" as kept, with "Sync orders" as its caller
