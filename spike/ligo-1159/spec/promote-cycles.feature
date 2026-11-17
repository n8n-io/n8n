# Source: solution.md sections 1 (decision 5), 3, 5.4 and 6.1.
Feature: Cycles across projects on Promote
  The Promote check reads items, not projects. Most cycles between projects
  pass in the right order. A true cycle needs one Promote for all its items.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And the branch is empty

  Rule: Workflows that call each other across two projects need an instance Promote

    @open-decision-2
    Scenario: A project Promote cannot write a cycle between two projects
      Given workflow "Sync orders" of project "Sales" calls workflow "Notify on-call" of project "Ops"
      And "Notify on-call" calls "Sync orders"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the Promote names each item of the cycle
      And the Promote shows this next step: "Sync orders and Notify on-call call each other across projects Sales and Ops. Promote them together with an instance Promote."

    @open-decision-2
    Scenario: An instance Promote writes a cycle between two projects
      Given workflow "Sync orders" of project "Sales" calls workflow "Notify on-call" of project "Ops"
      And "Notify on-call" calls "Sync orders"
      When the user starts an instance Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Notify on-call" to the branch under project "Ops"

  Rule: A cycle between projects that is not a cycle between items passes in order

    Scenario: Two projects depend on each other through different items
      Given workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"
      And workflow "Refresh CRM cache" of project "Platform" calls workflow "Format order" of project "Sales"
      When the user promotes "Format order" from project "Sales"
      And the user promotes credential "CRM key" and "Refresh CRM cache" from project "Platform"
      And the user promotes "Sync orders" from project "Sales"
      Then each Promote passes
      And no Promote shows a message about a cycle
