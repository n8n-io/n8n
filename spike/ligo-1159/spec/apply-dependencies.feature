# Source: solution.md sections 1, 2, 3.1, 3.2, 3.4, 3.8 and 3.12, and open
# decision 7 of section 9.
Feature: Apply checks dependencies
  A dependency goes before, or with, what uses it. On Apply, each dependency
  of an item that the Apply writes must be on the destination after the Apply:
  written by the same Apply, or already there. The consumer must also be able
  to use it after the Apply.

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

    Scenario: An error workflow follows the same rule as a sub-workflow
      Given the branch holds workflow "Daily report" under project "Sales"
      And "Daily report" uses "Notify on-call" as its error workflow
      And the destination does not hold "Notify on-call"
      And the user can apply project "Ops"
      When the user applies "Daily report" of project "Sales"
      Then the Apply stops before any write
      And the report shows a gap for "Notify on-call" in project "Ops"
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
      And the user can access project "Ops"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the gap says: "Archived on the destination. Restore it."

    Scenario: An archived dependency in a project that the user cannot access
      Given the destination holds "Notify on-call" in project "Ops"
      And "Notify on-call" is archived on the destination
      And the user cannot access project "Ops"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows a gap for the reference of "Sync orders"
      And the gap shows only the id and the name that the node of "Sync orders" holds
      And the report does not name project "Ops"
      And the report does not say that the target is archived
      And the gap offers the action "Ask the owner"

    Scenario: An archived dependency stops a strict Apply
      Given "Notify on-call" is archived on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

    Scenario: The Apply passes after a user restores the dependency
      Given "Notify on-call" is archived on the destination
      And a user restored "Notify on-call" on the destination
      When the user applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"

    Scenario: A workflow in a personal project of the destination counts as present
      Given the destination holds "Notify on-call" in a personal project
      When the user applies "Sync orders" of project "Sales"
      Then the report shows no gap for "Notify on-call"

  Rule: The check reads the state after the Apply

    A target that the same Apply writes is present. The consumer must still be
    able to use it. Including a target never changes a caller policy or an
    archive state.

    Scenario: The caller policy on the destination refuses the caller
      Given the destination holds "Notify on-call" in project "Ops"
      And the user can access project "Ops"
      And this Apply does not write "Notify on-call"
      And the caller policy of "Notify on-call" on the destination refuses callers of project "Sales"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the report names "Sync orders", "Notify on-call" and the caller policy as the reason

    Scenario: An included sub-workflow refuses the caller
      Given the destination does not hold "Notify on-call"
      And the user can apply project "Ops"
      And the caller policy of "Notify on-call" on the branch refuses callers of project "Sales"
      When the user applies "Sync orders" and "Notify on-call"
      Then the Apply stops before any write
      And the report shows a gap for "Notify on-call" with the caller policy as the reason

    Scenario: An included workflow that is archived on the destination stays a gap
      Given the destination holds "Notify on-call" in project "Ops"
      And "Notify on-call" is archived on the destination
      And the user can apply project "Ops"
      When the user applies "Sync orders" and "Notify on-call"
      Then the Apply stops before any write
      And the report shows a gap for "Notify on-call"
      And the gap says: "Archived on the destination. Restore it."
      And "Notify on-call" is still archived on the destination

  Rule: A reference that is not on the branch follows the reason on the branch

    The requirement row of the branch records why its target is not on the
    branch: "confirmed gap" or "broken on the source". A branch that an earlier
    version wrote has no reason.

    Background:
      Given the branch holds workflow "Daily report" under project "Sales"
      And "Daily report" calls a workflow that the branch does not hold
      And the destination does not hold that workflow

    @open-decision-7
    Scenario: A workflow calls a workflow that is broken on the source
      Given the requirement row of the reference has the reason "broken on the source"
      When the user applies "Daily report" of project "Sales"
      Then the Apply imports "Daily report"
      And the result shows a warning that names "Daily report" and the broken reference

    @open-decision-7
    Scenario: An incomplete Promote left out the sub-workflow
      Given the requirement row of the reference has the reason "confirmed gap"
      When the user applies "Daily report" of project "Sales"
      Then the Apply stops before any write
      And the report shows a gap for the reference of "Daily report"

    Scenario: A branch without reasons gives a warning for a workflow reference
      Given the requirement row of the reference has no reason
      When the user applies "Daily report" of project "Sales"
      Then the Apply imports "Daily report"
      And the result shows a warning that names "Daily report" and the reference

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
