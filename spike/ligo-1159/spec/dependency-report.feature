# Source: solution.md sections 3.1, 3.2, 3.3, 3.4, 3.7 (instance credentials) and 3.12.
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
        | situation                                                                           | group                                 |
        | in project "Sales" and not selected                                                 | Same project, not selected            |
        | in project "Platform", which the user can promote                                   | Other project that you can promote    |
        | in project "Platform", which the user cannot access                                 | Project that you cannot access        |
        | in the personal project of Alice                                                    | Personal resource                     |
        | in project "Platform", which the environment does not cover and the user can access | Project outside the environment scope |
        | in project "Platform", which the user can read and cannot promote                   | Project that you cannot promote       |

    Scenario: A project outside the environment scope is named only when the user can access it
      Given the promote environment does not cover project "Platform"
      And the user cannot access project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows the gap of "CRM key" in the group "Project outside the environment scope"
      And the gap says: "In a project that this environment does not cover."
      And the report does not name project "Platform"

    Scenario: A project that the user can read and cannot promote shows its name
      Given the user can read project "Platform"
      And the user cannot promote project "Platform"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows "CRM key" in project "Platform"
      And the gap offers the action "Ask the owner"
      And the gap does not offer "Include it"

  Rule: Some groups appear on Apply only

    Background:
      Given the branch holds "Sync orders" under project "Sales"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the user can access the projects "Platform" and "Ops"

    Scenario Outline: Group of a gap on Apply
      Given <situation>
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the report shows the gap in the group "<group>"
      And the gap offers the exit "<exit>"

      Examples:
        | situation                                                                            | group                                | exit                                   |
        | "Notify on-call" is archived on the destination                                      | Archived on the destination          | Restore it                             |
        | project "Sales" cannot use "CRM key" on the destination and the user cannot share it | Access that you cannot grant         | Continue incomplete when allowed       |
        | the selection of the Apply deletes "Notify on-call"                                  | Target that this Apply deletes       | Remove the deletion from the selection |
        | the caller policy of "Notify on-call" on the destination refuses "Sync orders"       | The caller policy refuses the caller | Continue incomplete when allowed       |

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

  Rule: An instance credential is a note, not a gap

    Scenario: The report shows a note for an instance credential
      Given "Sync orders" uses credential "Shared SMTP" with usage scope "instance"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows this note for "Shared SMTP": "An instance credential is not promoted. It must exist on the destination."
      And "Shared SMTP" is not a gap

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
