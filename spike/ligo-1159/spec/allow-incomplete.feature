# Source: solution.md sections 1, 3.3, 3.4, 3.5, 3.7 (placeholder), 3.8, 3.9, 3.12 and 6.
Feature: Incomplete Promote and Apply
  "Allow incomplete" is an opt-in setting of each environment and each
  direction. It is off by default. On an environment that allows it, the user
  can continue with gaps after confirming the list. Promotion Apply never
  changes the publish state, so a workflow with a gap does not go live.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"
    And "Sync orders" calls workflow "Notify on-call" of project "Ops"

  Rule: The setting is on each environment and each direction, and off by default

    Scenario: A new environment is strict
      When an admin creates a promote environment
      Then "Allow incomplete promotions" is off

    Scenario: The setting sits next to the review setting
      When an admin opens the settings of a promote environment
      Then the settings show "Allow incomplete promotions" next to the review setting

    Scenario: Each direction has its own setting
      Given "Allow incomplete promotions" is on for the promote environment
      And "Allow incomplete applies" is off for the apply environment
      Then a Promote can continue with gaps
      And an Apply cannot continue with gaps

    Scenario: The setting needs no extra permission
      Given "Allow incomplete promotions" is on for the promote environment
      And the user can promote project "Sales"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview offers to continue with the gaps

  Rule: An incomplete Promote writes the item after the user confirms the gaps

    Background:
      Given "Allow incomplete promotions" is on for the promote environment
      And the branch does not hold "CRM key" or "Notify on-call"

    Scenario: The user confirms the list of gaps
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview lists the gaps of "CRM key" and "Notify on-call"
      And the preview offers the action "Promote with 2 gaps"

    Scenario: Each gap is one reference
      Given workflow "Daily report" of project "Sales" also uses "CRM key"
      And "Daily report" has no other dependency
      When the user previews the Promote of "Sync orders" and "Daily report" from project "Sales"
      Then the preview lists 3 gaps: "Sync orders" to "CRM key", "Sync orders" to "Notify on-call" and "Daily report" to "CRM key"
      And the preview offers the action "Promote with 3 gaps"

    @open-decision-7
    Scenario: The Promote writes the item and records the gaps
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the branch holds a requirement for "CRM key" and for "Notify on-call"
      And each of the two requirements records the reason "confirmed gap"
      And the branch holds no file for "CRM key" or "Notify on-call"

    Scenario: The review description lists the gaps
      Given the promote environment opens a review for each Promote
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the description of the review lists the gaps of "CRM key" and "Notify on-call"
      And the commit message lists the same gaps

    Scenario: The confirmation must match the current gaps
      Given the user confirmed the gaps of "CRM key" and "Notify on-call"
      And a new gap appeared after the preview
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the result asks the user to confirm the new list

    @open-decision-7
    Scenario: A personal dependency can be a confirmed gap
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the branch holds no item of the personal project of Alice
      And the requirement for "Alice's token" records the reason "confirmed gap"

  Rule: A strict apply environment still stops on the gaps of an incomplete Promote

    Background:
      Given the apply environment is strict

    @open-decision-7
    Scenario: The gaps of the branch stop the Apply
      Given an incomplete Promote wrote "Sync orders" to the branch without "CRM key" and "Notify on-call"
      And the branch records "CRM key" and "Notify on-call" as confirmed gaps
      And the destination does not hold "CRM key" or "Notify on-call"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the result lists the gaps of "CRM key" and "Notify on-call"

    Scenario: A credential that is not on the branch stops a strict Apply
      Given the branch holds "Sync orders" under project "Sales"
      And the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply says: "CRM key is not on the branch. The owner team must promote it."

  Rule: An incomplete Apply writes the items with gaps after the user confirms

    Background:
      Given "Allow incomplete applies" is on for the apply environment
      And the branch holds "Sync orders" under project "Sales"

    Scenario: A workflow dependency stays unresolved
      Given the branch holds "Notify on-call" under project "Ops"
      And the destination does not hold "Notify on-call"
      And the user cannot apply project "Ops"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the Apply imports "Sync orders"
      And the reference of "Sync orders" to "Notify on-call" stays unresolved
      And the Apply creates no placeholder workflow

    Scenario: The reference resolves by itself when the dependency arrives
      Given an incomplete Apply imported "Sync orders" without "Notify on-call"
      When a user applies "Notify on-call" of project "Ops"
      Then the reference of "Sync orders" to "Notify on-call" resolves

    Scenario: The Apply confirmation must match the current gaps
      Given the user confirmed the gaps of the Apply of "Sync orders"
      And a new gap appeared after the preview
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the result asks the user to confirm the new list

  Rule: An incomplete Apply creates a placeholder for a credential that the destination does not hold

    Background:
      Given "Allow incomplete applies" is on for the apply environment
      And the branch holds "Sync orders" under project "Sales"
      And the user can create a credential in project "Sales"

    @open-decision-6
    Scenario: A credential that is not on the branch gets a placeholder
      Given the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the destination holds an empty credential "CRM key" in project "Sales"
      And the placeholder has the id, the name and the type of the source credential
      And the placeholder has a marker
      And "Sync orders" uses the placeholder

    Scenario: A credential in a project that the user cannot apply gets a placeholder
      Given the branch holds "CRM key" under project "Platform"
      And the destination does not hold "CRM key"
      And the user cannot apply project "Platform"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the destination holds an empty credential "CRM key" in project "Sales"
      And "Sync orders" uses the placeholder

    Scenario: One credential gets one placeholder when two projects of the Apply use it
      Given workflow "Daily report" of project "Ops" uses "CRM key"
      And the branch holds "Daily report" under project "Ops"
      And the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      And the changes view shows project "Sales" before project "Ops"
      And the user can create a credential in project "Ops"
      When the user confirms the gaps and applies "Sync orders" and "Daily report" in one Apply
      Then the destination holds one placeholder "CRM key", in project "Sales"
      And the Apply shares the placeholder with project "Ops"
      And "Sync orders" and "Daily report" use the placeholder

    Scenario: A placeholder needs the right to create a credential in the consumer project
      Given the user cannot create a credential in project "Sales"
      And the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the Apply creates no placeholder for "CRM key"
      And the Apply stops on "CRM key"

    Scenario: A credential that the destination holds gets no placeholder
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" cannot use "CRM key" on the destination
      And the user cannot share "CRM key"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the Apply creates no placeholder for "CRM key"
      And "Sync orders" uses "CRM key"
      And the binding does not work until a user grants project "Sales" access to "CRM key"

  Rule: Promotion Apply never changes the publish state

    Scenario: A new workflow with a gap lands unpublished
      Given "Allow incomplete applies" is on for the apply environment
      And the destination does not hold "Sync orders"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then "Sync orders" is not published on the destination

    Scenario: A live workflow keeps its live version
      Given "Allow incomplete applies" is on for the apply environment
      And "Sync orders" is published on the destination
      When the user confirms the gaps and applies a new version of "Sync orders"
      Then the version that was live stays live
      And the new version waits until a user publishes it

    @open-decision-2
    Scenario: The editor refuses to publish a workflow that uses an empty placeholder
      Given "Sync orders" uses the empty placeholder "CRM key" on the destination
      When a user publishes "Sync orders" in the editor
      Then the editor refuses to publish
      And the editor says that "CRM key" has no values

    @open-decision-2
    Scenario Outline: The public API and the CLI refuse to publish a workflow that uses a placeholder
      Given "Sync orders" uses the empty placeholder "CRM key" on the destination
      When a user publishes "Sync orders" through the <surface>
      Then the <surface> refuses to publish

      Examples:
        | surface    |
        | public API |
        | CLI        |

    @open-decision-2 @open-decision-6
    Scenario: A placeholder with a name from the branch and no secret is still a placeholder
      Given "Sync orders" uses the placeholder "CRM key" on the destination
      And a later Apply updated the name and the expression values of "CRM key"
      And no person saved secret values in "CRM key"
      When a user publishes "Sync orders" in the editor
      Then "CRM key" still has the marker
      And the editor refuses to publish
