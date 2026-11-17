# Source: solution.md sections 1 (decision 7), 3, 4.3, 4.4, 5.8, 5.11 and 6.3,
# and tickets 10 and 11 of section 9 for the behavior that they describe.
Feature: Apply writes dependencies in order
  Apply writes a dependency before the workflows that use it. Apply writes
  nothing while a dependency on the branch is not on the destination.

  Each block has a fix: select the dependency, apply the other project first,
  or use an instance Apply for a cycle. Apply has no "apply anyway".

  Background:
    Given the branch holds workflow "Sync orders" under project "Sales"
    And the branch holds workflow "Notify on-call" under project "Ops"
    And "Sync orders" calls "Notify on-call"
    And the destination has the team projects "Sales" and "Ops"

  Rule: A reference passes when this Apply writes the target or the destination holds it

    Scenario: Each dependency is on the destination
      Given the destination holds "Notify on-call" in project "Ops"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"
      And the Apply shows no new step

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
      And the Apply shows no step that asks to apply another project first

  Rule: A dependency that is on the branch and not on the destination stops the Apply

    Scenario: A sub-workflow of another project is not on the destination
      Given the destination does not hold "Notify on-call"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply shows this next step: "Sync orders calls Notify on-call in project Ops. Apply project Ops first."

    Scenario: A sub-workflow of the same project is not selected
      Given the branch holds workflow "Format order" under project "Sales"
      And "Sync orders" calls "Format order"
      And the destination holds "Notify on-call" in project "Ops"
      And the destination does not hold "Format order"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply shows this next step: "Select Format order too."

    Scenario: The Apply passes after the user applies the other project
      Given the destination does not hold "Notify on-call"
      And the user applied "Notify on-call" of project "Ops"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"

    Scenario: The Apply offers no way to continue with a missing dependency
      Given the destination does not hold "Notify on-call"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply offers no action that imports "Sync orders" with a broken reference

  Rule: Present means that the target exists and is not archived

    Scenario: An archived workflow does not count as present
      Given the destination holds "Notify on-call" in project "Ops"
      And "Notify on-call" is archived on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

    Scenario: A workflow that the same Apply deletes does not count as present
      Given the destination holds "Notify on-call" in project "Ops"
      And the same Apply deletes "Notify on-call" on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

    Scenario: A workflow in a personal project of the destination counts as present
      Given the destination holds "Notify on-call" in a personal project
      When the user applies "Sync orders" of project "Sales"
      Then the Apply does not report "Notify on-call" as a missing dependency

  Rule: A dependency that is not on the branch is a warning

    Scenario: A workflow calls a workflow that is broken on the source
      Given the branch holds workflow "Daily report" under project "Sales"
      And "Daily report" calls a workflow that the branch does not hold
      And the destination does not hold that workflow
      When the user applies "Daily report" of project "Sales"
      Then the Apply imports "Daily report"
      And the result shows a warning that names "Daily report" and the broken reference

  Rule: Workflows that call each other across two projects need an instance Apply

    @open-decision-2
    Scenario: A project Apply cannot write a cycle between two projects
      Given "Notify on-call" calls "Sync orders"
      And the destination holds neither "Sync orders" nor "Notify on-call"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply shows this next step: "Apply them together with an instance Apply."

    @open-decision-2
    Scenario: An instance Apply writes a cycle between two projects
      Given "Notify on-call" calls "Sync orders"
      And the destination holds neither "Sync orders" nor "Notify on-call"
      When the user starts an instance Apply
      Then the Apply imports "Sync orders" and "Notify on-call"

  Rule: A sub-workflow that does not allow the caller counts as a missing dependency

    Scenario: The caller policy on the destination refuses the caller
      Given the destination holds "Notify on-call" in project "Ops"
      And this Apply does not write "Notify on-call"
      And the caller policy of "Notify on-call" on the destination refuses callers of project "Sales"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply names "Sync orders", "Notify on-call" and the caller policy as the reason

  Rule: Each surface gets the same Apply check

    @open-decision-8
    Scenario Outline: A missing dependency stops the Apply on each surface
      Given the destination does not hold "Notify on-call"
      When the user applies "Sync orders" of project "Sales" through the <surface>
      Then the Apply stops before any write
      And the result is "blocked"

      Examples:
        | surface    |
        | UI         |
        | public API |
        | CLI        |
