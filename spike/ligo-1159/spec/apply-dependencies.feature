# Source: solution.md sections 1, 3.1, 3.2 and 3.4.
Feature: Apply checks dependencies
  A dependency goes before, or with, what uses it. On Apply, each dependency
  of an item that the Apply writes must be on the destination after the Apply:
  written by the same Apply, or already there.

  A reference that does not resolve after the Apply is a gap. Each gap shows
  the exits that the user can take. On a strict environment, a gap stops the
  Apply before any write.

  Background:
    Given the branch holds workflow "Sync orders" under project "Sales"
    And the branch holds workflow "Notify on-call" under project "Ops"
    And "Sync orders" calls "Notify on-call"
    And the destination has the team projects "Sales" and "Ops"
    And the apply environment is strict

  Rule: A reference passes when this Apply writes the target or the destination holds it

    Scenario: Each dependency is on the destination
      Given the destination holds "Notify on-call" in project "Ops"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"
      And the report shows no gap

    Scenario: The same Apply writes the dependency
      Given the branch holds workflow "Format order" under project "Sales"
      And "Sync orders" calls "Format order"
      And the destination holds "Notify on-call" in project "Ops"
      And the destination does not hold "Format order"
      When the user applies "Sync orders" and "Format order" of project "Sales"
      Then the Apply imports "Sync orders" and "Format order"

    Scenario: An instance Apply writes the whole package
      Given the destination holds neither "Sync orders" nor "Notify on-call"
      When the user starts an instance Apply
      Then the Apply imports "Notify on-call" in project "Ops"
      And the Apply imports "Sync orders" in project "Sales"
      And the report shows no gap

  Rule: A dependency that is on the branch and not on the destination is a gap

    Scenario: A sub-workflow of another project that the user can apply
      Given the destination does not hold "Notify on-call"
      And the user can apply project "Ops"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for "Notify on-call" in project "Ops"
      And the gap offers the action "Include it"

    Scenario: The user includes the dependency and the Apply passes
      Given the destination does not hold "Notify on-call"
      And the user can apply project "Ops"
      When the user includes "Notify on-call" and applies the selection
      Then the Apply imports "Notify on-call" in project "Ops"
      And the Apply imports "Sync orders" in project "Sales"

    Scenario: The user cannot apply the project of the sub-workflow
      Given the destination does not hold "Notify on-call"
      And the user cannot apply project "Ops"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the gap offers the action "Ask the owner"
      And the report does not name project "Ops"

    Scenario: A sub-workflow of the same project is not selected
      Given the branch holds workflow "Format order" under project "Sales"
      And "Sync orders" calls "Format order"
      And the destination holds "Notify on-call" in project "Ops"
      And the destination does not hold "Format order"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for "Format order"
      And the gap offers the action "Include it"

    Scenario: A gap stops a strict Apply before any write
      Given the destination does not hold "Notify on-call"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply offers no action that imports "Sync orders" with the gap

    Scenario: The Apply passes after a user applies the other project
      Given the destination does not hold "Notify on-call"
      And a user applied "Notify on-call" of project "Ops"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"

  Rule: Present means that the target exists and is not archived

    Scenario: An archived dependency is a gap with a fix
      Given the destination holds "Notify on-call" in project "Ops"
      And "Notify on-call" is archived on the destination
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the gap says: "Archived on the destination. Restore it."

    Scenario: An archived dependency stops a strict Apply
      Given "Notify on-call" is archived on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

    Scenario: The Apply passes after a user restores the dependency
      Given "Notify on-call" is archived on the destination
      And a user restored "Notify on-call" on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"

    Scenario: A workflow that the same Apply deletes does not count as present
      Given the destination holds "Notify on-call" in project "Ops"
      And the same Apply deletes "Notify on-call" on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

    Scenario: A workflow in a personal project of the destination counts as present
      Given the destination holds "Notify on-call" in a personal project
      When the user applies "Sync orders" of project "Sales"
      Then the report shows no gap for "Notify on-call"

  Rule: A workflow reference that is not on the branch is a warning

    Scenario: A workflow calls a workflow that is broken on the source
      Given the branch holds workflow "Daily report" under project "Sales"
      And "Daily report" calls a workflow that the branch does not hold
      And the destination does not hold that workflow
      When the user applies "Daily report" of project "Sales"
      Then the Apply imports "Daily report"
      And the result shows a warning that names "Daily report" and the broken reference

  Rule: A sub-workflow that does not allow the caller is a gap

    Scenario: The caller policy on the destination refuses the caller
      Given the destination holds "Notify on-call" in project "Ops"
      And this Apply does not write "Notify on-call"
      And the caller policy of "Notify on-call" on the destination refuses callers of project "Sales"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the report names "Sync orders", "Notify on-call" and the caller policy as the reason

  Rule: Each surface gets the same Apply check

    Scenario Outline: A gap stops the Apply on each surface
      Given the destination does not hold "Notify on-call"
      When the user applies "Sync orders" of project "Sales" through the <surface>
      Then the Apply stops before any write
      And the result is "blocked"

      Examples:
        | surface    |
        | UI         |
        | public API |
        | CLI        |
