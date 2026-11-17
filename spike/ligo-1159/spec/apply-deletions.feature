# Source: behavior kept from the previous revision of solution.md (guards
# against deletion). The current solution.md does not change it.
Feature: Guards against deletion on Apply
  Apply does not delete a resource that the applied workflows still need, and
  it reports a deletion that breaks a caller on the destination.

  Rule: Apply lists the destination callers of a workflow that it deletes

    Scenario: A workflow on the destination calls a workflow that the Apply deletes
      Given the destination holds workflow "Notify on-call" in project "Ops"
      And the destination holds workflow "Legacy alert" in project "Support"
      And "Legacy alert" calls "Notify on-call"
      And this Apply deletes "Notify on-call" and does not write "Legacy alert"
      When the user applies project "Ops"
      Then the Apply stops before any write
      And the Apply lists "Legacy alert" as a caller of "Notify on-call"

    Scenario: The user accepts the broken callers
      Given the Apply lists "Legacy alert" as a caller of the deleted workflow "Notify on-call"
      When the user accepts and continues
      Then the Apply deletes "Notify on-call"
      And "Legacy alert" has a broken reference on the destination

    Scenario: The user cancels
      Given the Apply lists "Legacy alert" as a caller of the deleted workflow "Notify on-call"
      When the user cancels
      Then the destination does not change

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
