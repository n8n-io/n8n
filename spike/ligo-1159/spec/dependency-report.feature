# Source: solution.md sections 3.2 and 3.12.
Feature: The dependency report
  Promote and Apply show the same report. It groups each gap, shows its state,
  and offers the exits that the user can take. The preview and the operation
  compute it from the same plan.

  A user never sees information about a resource that they cannot access.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"
    And the branch does not hold "CRM key"

  Rule: The report groups each gap by what the user can do

    Scenario Outline: Group of a gap
      Given the dependency is <situation>
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows the gap in the group "<group>"

      Examples:
        | situation                                              | group                                  |
        | in project "Sales" and not selected                    | Same project, not selected             |
        | in project "Platform", which the user can promote      | Other project that you can promote     |
        | in project "Platform", which the user cannot access    | Project that you cannot access         |
        | in the personal project of Alice                       | Personal resource                      |

  Rule: The report shows the state of a dependency that the user can access

    Scenario: The dependency is missing from the branch
      Given the user can access project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows "CRM key" in project "Platform" with the state "Not on the branch"

    Scenario: The dependency is in an open review
      Given the user can access project "Platform"
      And an open review holds the Promote of "CRM key" from project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows "CRM key" with the state "In an open review"
      And the row links to that review

    Scenario: The gap closes when the review is merged
      Given an open review holds the Promote of "CRM key" from project "Platform"
      And the review was merged into the branch
      When the user promotes "Sync orders" from project "Sales"
      Then the report shows no gap
      And the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: A gap in a project that the user cannot access shows only what the workflow already holds

    Scenario: The report shows the reference as the node holds it
      Given the user cannot access project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows the credential "CRM key" with its type and its id, as the node of "Sync orders" holds them
      And the report does not name project "Platform"
      And the report does not show the state of "CRM key"

    Scenario: The report does not show a review that the user cannot access
      Given the user cannot access project "Platform"
      And an open review holds the Promote of "CRM key" from project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report does not link to that review
      And the report does not say that a review exists

    Scenario: The gap offers "Ask the owner"
      Given the user cannot access project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the gap of "CRM key" offers the action "Ask the owner"

  Rule: The report says what it does not check

    Scenario: A reference that an expression computes is not checked
      Given "Sync orders" calls a workflow whose id an expression computes
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows this note for the reference: "Resolved at run time. Not checked."
      And the reference is not a gap

  Rule: Promote and Apply show the same report

    Scenario Outline: Each operation shows the report
      Given "Sync orders" has a gap
      When the user opens the <operation> of "Sync orders"
      Then the <operation> shows the dependency report

      Examples:
        | operation |
        | Promote   |
        | Apply     |
