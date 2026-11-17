# Source: solution.md sections 1, 3.4, 3.5, 3.7 (placeholder), 3.8 and 3.9.
Feature: Incomplete Promote and Apply
  "Allow incomplete" is an opt-in setting of each environment and each
  direction. It is off by default. On an environment that allows it, the user
  can continue with gaps after confirming the list. An incomplete Apply never
  makes a workflow with a gap go live.

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

    Scenario: The Promote writes the item and records the gaps
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the branch holds a requirement for "CRM key" and for "Notify on-call"
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

    Scenario: A personal dependency can be a confirmed gap
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the branch holds no item of the personal project of Alice

  Rule: A strict apply environment still stops on the gaps of an incomplete Promote

    Scenario: The gaps of the branch stop the Apply
      Given an incomplete Promote wrote "Sync orders" to the branch without "CRM key"
      And the apply environment is strict
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write

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

    Scenario: A credential that is not on the branch gets a placeholder
      Given the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      When the user confirms the gaps and applies "Sync orders" of project "Sales"
      Then the destination holds an empty credential "CRM key" in project "Sales"
      And the placeholder has the id, the name and the type of the source credential
      And "Sync orders" uses the placeholder

    Scenario: A credential that is not on the branch stops a strict Apply
      Given the apply environment is strict
      And the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      When the user applies "Sync orders" of project "Sales"
      Then the Apply stops before any write
      And the Apply says: "CRM key is not on the branch. The owner team must promote it."

  Rule: Promotion Apply never changes what is live

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
