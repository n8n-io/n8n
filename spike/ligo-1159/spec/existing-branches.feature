# Source: behavior kept from the previous revision of solution.md (existing
# branches), with the gaps and exits of solution.md sections 3.2 to 3.4.
Feature: Branches that an earlier version wrote
  There is no migration. A branch that an earlier version wrote can hold a
  credential at the top level, with no owner, and a reference to a workflow
  that is not on the branch.

  Background:
    Given an earlier version wrote the branch
    And the branch holds workflow "Sync orders" under project "Sales"
    And the branch holds credential "CRM key" at the top level
    And "Sync orders" uses "CRM key"

  Rule: The Promote check covers only the items of the Promote

    Scenario: An existing violation does not stop an unrelated Promote
      Given workflow "Daily report" of project "Sales" has no dependency
      When the user promotes "Daily report" from project "Sales"
      Then the Promote writes "Daily report" to the branch under project "Sales"
      And the report shows no gap for "Sync orders"

  Rule: A credential at the top level does not count as on the branch

    Scenario: A workflow that uses a top-level credential has a gap at its next Promote
      Given credential "CRM key" is in project "Platform" on the source
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "CRM key"

    Scenario: The gap stops a strict Promote
      Given credential "CRM key" is in project "Platform" on the source
      And the promote environment is strict
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops

    Scenario: The Promote passes after the owner project promotes the credential
      Given credential "CRM key" is in project "Platform" on the source
      And a user promoted credential "CRM key" from project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: On Apply, the user selects the home of a top-level credential

    Scenario: The Apply dialog shows the home selector
      Given the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the dialog asks the user to select a team project as the home of "CRM key"
      And no project is selected in advance
      And project "Sales" is first in the list, because it uses "CRM key"

    Scenario: The home selector never offers a personal project
      Given the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then the home selector offers no personal project

    Scenario: The home selector leaves out a project that the same Apply deletes
      Given the destination does not hold "CRM key"
      And the destination has project "Archive", which the branch does not hold
      When the user starts an instance Apply
      Then the home selector does not offer project "Archive"

    Scenario: The step says what the home project means
      Given the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then the step states the rights of the home project
      And the step states that an Apply of the home project updates the credential from the branch

    Scenario: An existing API client reads the conflict that it knows
      Given the destination does not hold "CRM key"
      When a public API client applies project "Sales"
      Then the result is "blocked"
      And the result reports "CRM key" with the conflict "unknown-owner"

  Rule: A reference to a workflow that is not on the branch is a warning on Apply

    Scenario: The workflow arrives with a broken reference and the result says so
      Given "Sync orders" calls workflow "Notify on-call"
      And the branch does not hold "Notify on-call"
      And the destination does not hold "Notify on-call"
      And project "Sales" can use "CRM key" on the destination
      When the user applies project "Sales"
      Then the Apply imports "Sync orders"
      And the result shows a warning that names "Sync orders" and "Notify on-call"
