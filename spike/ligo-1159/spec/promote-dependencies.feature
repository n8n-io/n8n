# Source: solution.md sections 1, 3, 4.2, 5.1, 5.2, 5.3, 5.5 and 6.1.
Feature: Promote checks dependencies first
  The branch resolves every reference that resolves on the source.
  A Promote that breaks this rule stops and names the dependency to promote first.

  Promote checks each item that it writes. Each dependency of the item must be
  on the branch after the Promote: in the same Promote, or already on the branch.
  A dependency is a static reference to a credential, a sub-workflow or an
  error workflow.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" is in project "Sales" on the source

  Rule: A dependency that is on the branch after the Promote passes

    Scenario: Each dependency is already on the branch
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch holds credential "CRM key" under project "Platform"
      And the branch holds workflow "Notify on-call" under project "Ops"
      When the user promotes "Sync orders" from project "Sales"
      Then the preview shows no warning
      And the Promote shows no new step
      And the Promote writes "Sync orders" to the branch under project "Sales"

    Scenario: A dependency of the same project is in the same Promote
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the branch does not hold "Format order"
      When the user promotes "Sync orders" and "Format order" from project "Sales"
      Then the Promote writes "Sync orders" and "Format order" to the branch

  Rule: A dependency of the same project that is not selected stops the Promote

    Scenario: The preview offers to select the dependency
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the branch does not hold "Format order"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then "Sync orders" cannot be promoted
      And the preview shows this next step for "Format order": "Select it too"
      And the preview offers an action that adds "Format order" to the selection

    Scenario: The user adds the dependency and the Promote passes
      Given "Sync orders" calls workflow "Format order" of project "Sales"
      And the preview offers to add "Format order" to the selection
      When the user adds "Format order" to the selection
      And the user promotes the selection
      Then the Promote writes "Sync orders" and "Format order" to the branch

    Scenario: An error workflow follows the same rule as a sub-workflow
      Given "Sync orders" has the error workflow "Report failure" of project "Sales"
      And the branch does not hold "Report failure"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then "Sync orders" cannot be promoted
      And the preview shows this next step for "Report failure": "Select it too"

  Rule: A dependency of another team project that is not on the branch stops the Promote

    Scenario: A sub-workflow of another team project is not on the branch
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview lists "Notify on-call" under "Sync orders" with the state "Not on the branch"
      And the preview shows this next step for "Notify on-call": "Promote it from project Ops first."
      And "Sync orders" cannot be promoted

    Scenario: A credential of another team project is not on the branch
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview lists "CRM key" under "Sync orders" with the state "Not on the branch"
      And the preview shows this next step for "CRM key": "Promote credential CRM key from project Platform first."
      And "Sync orders" cannot be promoted

    Scenario: The next step links to the Promote page of the owner project
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user can open the Promote page of project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the row of "Notify on-call" links to the Promote page of project "Ops"

    Scenario: The next step names who can promote the dependency
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And the user cannot open the Promote page of project "Ops"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the row of "Notify on-call" says who can promote it

    Scenario: The Promote passes after each owner team promotes its dependency
      Given "Sync orders" uses credential "CRM key" of project "Platform"
      And "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And a user promoted "Notify on-call" from project "Ops"
      And a user promoted credential "CRM key" from project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: The check gives a result for each item

    Scenario: An item with a missing dependency does not stop the result of another item
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      And workflow "Daily report" of project "Sales" has no dependency
      When the user previews the Promote of "Sync orders" and "Daily report" from project "Sales"
      Then "Sync orders" cannot be promoted
      And "Daily report" can be promoted

    Scenario: The Promote dialog promotes only a selection where each item passes
      Given "Sync orders" cannot be promoted
      And "Daily report" can be promoted
      When the user has "Sync orders" and "Daily report" in the selection of the Promote dialog
      Then the dialog does not start the Promote
      When the user removes "Sync orders" from the selection
      Then the dialog can start the Promote

  Rule: Promote never adds the content of another project

    Scenario: A Promote of one project writes only the items of that project
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the Promote does not write "Notify on-call" to the branch

  Rule: A dependency in a personal project stops the Promote

    Scenario: A workflow uses a credential of a personal project
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then "Sync orders" cannot be promoted
      And the preview shows this next step for "Alice's token": "This credential belongs to a personal project. Move it to a team project, then promote it from there."

    Scenario: A workflow calls a workflow of a personal project
      Given "Sync orders" calls workflow "Alice's helper" of the personal project of Alice
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then "Sync orders" cannot be promoted
      And the preview shows this next step for "Alice's helper": "Personal projects are not promoted. Move it to a team project."

    Scenario: The Promote passes after the dependency moves to a team project
      Given "Sync orders" uses credential "Alice's token" of the personal project of Alice
      And Alice moved "Alice's token" to project "Sales" in the editor
      When the user promotes "Sync orders" and credential "Alice's token" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the Promote writes "Alice's token" to the branch under project "Sales"

  Rule: A reference that already fails on the source is a warning, not a block
    Promotion copies the source. It does not repair it. The destination must
    never be worse than the source: a reference that works on the source must
    work on the destination. A reference that already fails on the source has
    no dependency to promote first, so it arrives broken in the same place.

    @open-decision-10
    Scenario: A workflow calls a workflow that does not exist on the source
      Given "Sync orders" calls a workflow that a user deleted on the source
      And the call already fails on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the preview shows this warning for the reference: "This reference is broken."
      And the Promote writes "Sync orders" to the branch under project "Sales"
      And the reference is broken on the branch as it is on the source

    @open-decision-10
    Scenario: The same Promote check blocks a reference that works on the source
      Given "Sync orders" calls a workflow that a user deleted on the source
      And workflow "Daily report" of project "Sales" calls workflow "Notify on-call" of project "Ops"
      And the call of "Daily report" works on the source
      And the branch does not hold "Notify on-call"
      When the user previews the Promote of "Sync orders" and "Daily report" from project "Sales"
      Then "Sync orders" can be promoted, with a warning
      And "Daily report" cannot be promoted
      And the preview shows this next step for "Notify on-call": "Promote it from project Ops first."

  Rule: A reference that an expression computes is not checked

    Scenario: A workflow computes the id of the called workflow at run time
      Given "Sync orders" calls a workflow whose id an expression computes
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the preview shows this note for the reference: "Resolved at run time. Not checked."
      And "Sync orders" can be promoted

  Rule: The check asks its questions in a fixed order

    Scenario Outline: Result for one static reference of an item that the Promote writes
      Given "Sync orders" has a static reference to a target
      And the target works on the source: <works on the source>
      And the target is in a personal project: <personal project>
      And the target is on the branch after the Promote: <on the branch after the Promote>
      And the target is in project "Sales": <same project>
      When the user promotes "Sync orders" from project "Sales"
      Then the result for the reference is "<result>"
      And the next step is "<next step>"

      Examples:
        | works on the source | personal project | on the branch after the Promote | same project | result  | next step                         |
        | no                  | not checked      | not checked                     | not checked  | warning | none: broken on the source        |
        | yes                 | yes              | not checked                     | not checked  | block   | move it to a team project         |
        | yes                 | no               | yes                             | not checked  | pass    | none                              |
        | yes                 | no               | no                              | yes          | block   | select it too                     |
        | yes                 | no               | no                              | no           | block   | promote it from its project first |

  Rule: The Promote runs the same check as the preview

    Scenario: A Promote without a preview gets the same check
      Given "Sync orders" calls workflow "Notify on-call" of project "Ops"
      And the branch does not hold "Notify on-call"
      When a client promotes "Sync orders" from project "Sales" and does not ask for a preview
      Then the Promote stops
      And the result names "Notify on-call" and the next step

    Scenario: The Promote decides when the branch changed after the preview
      Given the preview of "Sync orders" showed no warning
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
