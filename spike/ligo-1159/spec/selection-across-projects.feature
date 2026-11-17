# Source: solution.md sections 3.1, 3.2, 3.3, 3.4 and 3.12.
Feature: Selection across projects
  The changes view groups the changes by project. A user can select items of
  several projects in one Promote or one Apply. A Promote across projects opens
  one review. An Apply across projects resolves each reference against the
  whole plan.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" of project "Sales" calls workflow "Notify on-call" of project "Ops"
    And the branch is empty

  Rule: The changes view groups the changes by project and shows only the projects that the user can access

    Scenario: The view shows one group for each project
      Given the user can access the projects "Sales" and "Ops"
      When the user opens the changes view
      Then the view shows a group for project "Sales" and a group for project "Ops"

    Scenario: The view leaves out a project that the user cannot access
      Given the user can access the projects "Sales" and "Ops"
      And project "Platform" has changes
      When the user opens the changes view
      Then the view shows no group for project "Platform"

    Scenario: The view shows only the projects of the environment scope
      Given the environment covers the projects "Sales" and "Platform"
      When an admin opens the changes view
      Then the view shows no group for project "Ops"

  Rule: One Promote can write items of several projects

    Scenario: "Include it" adds an item of another project to the selection
      Given the environment covers the projects "Sales" and "Ops"
      And the user can promote the projects "Sales" and "Ops"
      And the user can read "Notify on-call"
      And the report shows a gap for "Notify on-call" with the action "Include it"
      When the user includes "Notify on-call"
      And the user promotes the selection
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Notify on-call" to the branch under project "Ops"

    Scenario: A Promote across projects opens one review
      Given the promote environment opens a review for each Promote
      And the selection holds "Sync orders" of project "Sales" and "Notify on-call" of project "Ops"
      When the user promotes the selection
      Then the Promote opens one review
      And the review lists the projects "Sales" and "Ops"

    Scenario: The open-review gate checks each project of the selection
      Given an open review holds the changes of project "Ops"
      And the selection holds "Sync orders" of project "Sales" and "Notify on-call" of project "Ops"
      When the user previews the Promote of the selection
      Then the preview says that project "Ops" has an open review

    Scenario: A Promote across projects needs the right in each project
      Given the user can promote project "Sales"
      And the user cannot promote project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the gap of "Notify on-call" does not offer "Include it"

    Scenario: "Include it" needs the project in the environment scope
      Given the environment covers the projects "Sales" and "Platform"
      And the user can access project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the gap of "Notify on-call" does not offer "Include it"

    Scenario: "Include it" needs read access to the item
      Given the user can promote the projects "Sales" and "Ops"
      And the user cannot read "Notify on-call"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the gap of "Notify on-call" does not offer "Include it"

  Rule: Workflows that call each other across two projects go in one operation

    Scenario: One Promote writes a cycle between two projects
      Given "Notify on-call" calls "Sync orders"
      And the user can promote the projects "Sales" and "Ops"
      When the user promotes "Sync orders" and "Notify on-call" in one Promote
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Notify on-call" to the branch under project "Ops"

    Scenario: A cycle with a project that the user cannot promote is a gap
      Given "Notify on-call" calls "Sync orders"
      And the user cannot promote project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the gap offers the action "Ask the owner"

    Scenario: Two owners who each can promote one project cannot close a cycle
      Given "Notify on-call" calls "Sync orders"
      And the promote environment is strict
      And user "Sales owner" can promote project "Sales" only
      And user "Ops owner" can promote project "Ops" only
      When "Sales owner" previews the Promote of "Sync orders" from project "Sales"
      And "Ops owner" previews the Promote of "Notify on-call" from project "Ops"
      Then neither Promote can pass
      And each report offers "Ask the owner" for the other workflow
      And a request to the owner does not close the cycle

    Scenario: A user who can promote both projects promotes the cycle in one Promote
      Given "Notify on-call" calls "Sync orders"
      And the promote environment is strict
      And "Sales owner" and "Ops owner" cannot close the cycle
      And an admin can promote the projects "Sales" and "Ops"
      When the admin promotes "Sync orders" and "Notify on-call" in one Promote
      Then the Promote writes "Sync orders" and "Notify on-call" to the branch

    Scenario: One Apply writes a cycle between two projects
      Given "Notify on-call" calls "Sync orders"
      And the branch holds "Sync orders" under project "Sales" and "Notify on-call" under project "Ops"
      And the destination holds neither "Sync orders" nor "Notify on-call"
      When the user applies "Sync orders" and "Notify on-call" in one Apply
      Then the Apply imports "Sync orders" and "Notify on-call"

  Rule: A cycle between projects that is not a cycle between items passes in order

    Scenario: Two projects depend on each other through different items
      Given workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"
      And workflow "Refresh CRM cache" of project "Platform" calls workflow "Format order" of project "Sales"
      When the user promotes "Format order" from project "Sales"
      And the user promotes credential "CRM key" and "Refresh CRM cache" from project "Platform"
      And the user promotes "Sync orders" from project "Sales"
      Then each Promote passes

  Rule: An Apply across projects resolves references against the whole plan

    Scenario: A dependency in the same Apply counts as present
      Given the branch holds "Sync orders" under project "Sales" and "Notify on-call" under project "Ops"
      And the destination does not hold "Notify on-call"
      When the user applies "Sync orders" and "Notify on-call" in one Apply
      Then the Apply reports no gap
      And the Apply imports "Notify on-call" in project "Ops"
      And the Apply imports "Sync orders" in project "Sales"

    Scenario: An instance Promote and an instance Apply select every change
      When an admin starts an instance Promote
      Then the Promote holds the changes of every team project of the environment
