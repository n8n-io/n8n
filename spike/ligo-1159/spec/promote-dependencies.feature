# Source: solution.md sections 1, 2, 3.1, 3.2, 3.3, 3.7 (instance credentials), 3.10 and 3.12.
Feature: Promote checks dependencies
  A dependency goes before, or with, what uses it. On Promote, each dependency
  of an item that the Promote writes must be on the branch after the Promote:
  in the same Promote, or already on the branch.

  A dependency is a static reference to a credential, a sub-workflow or an
  error workflow. A reference that does not resolve after the Promote is a gap.
  Each gap shows the exits that the user can take. On a strict environment, a
  gap stops the Promote.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" is in project "Sales" on the source
    And the promote environment is strict

  Rule: A dependency that is on the branch after the Promote passes

    Scenario: Each dependency is already on the branch
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch holds credential "CRM key" under project "Platform"
      And the branch holds workflow "Notify on-call" under project "Ops"
      When the user promotes "Sync orders" from project "Sales"
      Then the report shows no gap
      And the Promote writes "Sync orders" to the branch under project "Sales"

    Scenario: A dependency of the same project is in the same Promote
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the branch does not hold "Format order"
      When the user promotes "Sync orders" and "Format order" from project "Sales"
      Then the Promote writes "Sync orders" and "Format order" to the branch

  Rule: A gap that the user can close offers "Include it"

    Scenario: A dependency of the same project is not selected
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the branch does not hold "Format order"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Format order"
      And the gap offers the action "Include it"

    Scenario: The user includes the dependency and the Promote passes
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the report shows a gap for "Format order" with the action "Include it"
      When the user includes "Format order"
      And the user promotes the selection
      Then the Promote writes "Sync orders" and "Format order" to the branch

    Scenario: A dependency of another project that the user can promote
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user can promote project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Notify on-call" in project "Ops"
      And the gap offers the action "Include it"

    Scenario: An error workflow follows the same rule as a sub-workflow
      Given "Sync orders" has the error workflow "Report failure" of project "Sales"
      And the branch does not hold "Report failure"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Report failure"
      And the gap offers the action "Include it"

  Rule: On a strict environment a gap stops the Promote

    Scenario: A gap stops the Promote and nothing is written
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And the branch does not hold "CRM key"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the branch does not change

    Scenario: A strict environment offers no way to continue with a gap
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview offers no action that promotes "Sync orders" with the gap

    Scenario: The Promote passes after each owner team promotes its dependency
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And a user promoted "Notify on-call" from project "Ops"
      And a user promoted credential "CRM key" from project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: The check gives a result for each item

    Scenario: An item with a gap does not stop the result of another item
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And workflow "Daily report" of project "Sales" has no dependency
      When the user previews the Promote of "Sync orders" and "Daily report" from project "Sales"
      Then "Sync orders" has a gap
      And "Daily report" has no gap

    Scenario: The Promote dialog promotes only a selection without gaps
      Given "Sync orders" has a gap
      And "Daily report" has no gap
      When the user has "Sync orders" and "Daily report" in the selection of the Promote dialog
      Then the dialog does not start the Promote
      When the user removes "Sync orders" from the selection
      Then the dialog can start the Promote

  Rule: A dependency in a project outside the environment scope is a gap that the user cannot include

    Scenario: A dependency in a project outside the environment scope
      Given the promote environment covers the projects "Sales" and "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user can access project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the gap says: "In a project that this environment does not cover."
      And the gap does not offer "Include it"

    Scenario: The user cannot access the project outside the environment scope
      Given the promote environment covers the projects "Sales" and "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user cannot access project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap with only the id of the workflow, as the node of "Sync orders" holds it
      And the report does not name project "Ops"
      And the gap does not offer "Include it"

  Rule: Promote never adds the content of another project by itself

    Scenario: The Promote does not write a dependency that the user did not include
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user can promote project "Ops"
      When the user promotes "Sync orders" from project "Sales" and does not include "Notify on-call"
      Then the Promote stops
      And the Promote does not write "Notify on-call" to the branch

  Rule: A dependency in a personal project is a gap with a fix

    Scenario: A workflow uses a credential of a personal project
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Alice's token"
      And the gap says: "This credential belongs to a personal project. Move it to a team project, then promote it from there."

    Scenario: A workflow calls a workflow of a personal project
      Given "Sync orders" calls workflow "Alice's helper" of the personal project of Alice
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Alice's helper"
      And the gap says: "Personal projects are not promoted. Move it to a team project."

    Scenario: The Promote passes after the dependency moves to a team project
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And Alice moved "Alice's token" to project "Sales" in the editor
      When the user promotes "Sync orders" and credential "Alice's token" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Alice's token" to the branch under project "Sales"

  Rule: A reference that already fails on the source is a warning, not a gap
    Promotion copies the source. It does not repair it. The destination must
    never be worse than the source: a reference that works on the source must
    work on the destination. A reference that already fails on the source has
    no dependency to promote first, so it arrives broken in the same place.

    Scenario: A workflow calls a workflow that does not exist on the source
      Given "Sync orders" calls a workflow that a user deleted on the source
      And the call already fails on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the report shows this warning for the reference: "This reference is broken."
      And the Promote writes "Sync orders" to the branch under project "Sales"
      And the reference is broken on the branch as it is on the source

    @open-decision-7
    Scenario: The Promote records that a reference is broken on the source
      Given "Sync orders" calls a workflow that a user deleted on the source
      And the call already fails on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the branch holds a requirement for the deleted workflow
      And the requirement records the reason "broken on the source"

    Scenario: The same Promote check stops a reference that works on the source
      Given "Sync orders" calls a workflow that a user deleted on the source
      And workflow "Daily report" of project "Sales" calls workflow "Notify on-call" of project "Ops"
      And the call of "Daily report" works on the source
      And the branch does not hold "Notify on-call"
      When the user previews the Promote of "Sync orders" and "Daily report" from project "Sales"
      Then "Sync orders" has a warning and no gap
      And "Daily report" has a gap for "Notify on-call"

    Scenario: A target that the check cannot resolve counts as working
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the check cannot tell whether the call works on the source
      And the branch does not hold "Notify on-call"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "Notify on-call"
      And the report shows no warning for the reference

  Rule: The check asks its questions in a fixed order

    Scenario Outline: Result for one static reference of an item that the Promote writes
      Given "Sync orders" has a static reference to a target
      And the target works on the source: <works on the source>
      And the target is in a personal project: <personal project>
      And the target is a credential with usage scope "instance": <instance credential>
      And the target is on the branch after the Promote: <on the branch after the Promote>
      And the user can include the target: <can include it>
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the result for the reference is "<result>"
      And the exit is "<exit>"

      # "can include it" needs three things: the project of the target is in
      # the environment scope, the user can promote that project, and the user
      # can read the target.
      Examples:
        | works on the source | personal project | instance credential | on the branch after the Promote | can include it | result  | exit                                   |
        | no                  | not checked      | not checked         | not checked                     | not checked    | warning | none: broken on the source             |
        | yes, or unknown     | yes              | not checked         | not checked                     | not checked    | gap     | move it to a team project              |
        | yes, or unknown     | no               | yes                 | not checked                     | not checked    | note    | none: it must exist on the destination |
        | yes, or unknown     | no               | no                  | yes                             | not checked    | pass    | none                                   |
        | yes, or unknown     | no               | no                  | no                              | yes            | gap     | include it                             |
        | yes, or unknown     | no               | no                  | no                              | no             | gap     | ask the owner                          |

  Rule: The Promote runs the same check as the preview

    Scenario: A Promote without a preview gets the same check
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      When a client promotes "Sync orders" from project "Sales" and does not ask for a preview
      Then the Promote stops
      And the result lists the gap for "Notify on-call"

    Scenario: The Promote decides when the branch changed after the preview
      Given the preview of "Sync orders" showed no gap
      And a dependency of "Sync orders" is no longer on the branch
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops

    Scenario Outline: Each surface gets the same check
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      When the user promotes "Sync orders" from project "Sales" through the <surface>
      Then the Promote stops

      Examples:
        | surface    |
        | UI         |
        | public API |
        | CLI        |
