# Source: solution.md sections 3 (row "Permission boundary"), 4.6 and 6.7.
Feature: Permissions in promotion
  Promotion acts as the user. It reports, it does not act for the user, and
  it does not show what the user cannot read.

  Today only global owners and admins promote and apply, and they can read
  everything. These rules are for project-level promotion rights.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"

  Rule: The Promote check needs no read access to a dependency that is on the branch

    Scenario: The user cannot read a dependency that is on the branch
      Given the user cannot read "CRM key"
      And the branch holds credential "CRM key" under project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: A dependency that the user cannot read is never named

    Scenario: The user cannot read a dependency that is not on the branch
      Given the user cannot read "CRM key"
      And the branch does not hold "CRM key"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the Promote shows this message: "A resource that you cannot access is not on the branch. Ask an administrator."
      And the message does not name "CRM key"

    Scenario: A block names a project only when the user can read it
      Given the user can read "CRM key"
      And the user cannot read project "Platform"
      And the branch does not hold "CRM key"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the message says who can promote the dependency
      And the message does not name project "Platform"

  Rule: Each write of an Apply has its own permission check

    Scenario Outline: An action appears only when the user holds its permission
      Given an Apply needs this action: <action>
      And the user does not hold this permission: <needs>
      When the user previews the Apply
      Then the Apply does not offer the action
      And the Apply shows: <without it>

      Examples:
        | action                           | needs                                                        | without it                                   |
        | create the owner project         | project:create and a free team project in the licence quota  | who can, and "apply that project first"      |
        | create the credential            | credential:create in the owner project                       | who can                                      |
        | grant access to a consumer       | credential:share on the credential                           | a block that says who can grant              |
        | move a workflow                  | workflow:move on the workflow                                | a block that names the missing permission    |
        | move a workflow to a new project | workflow:create in the new project                           | a block that names the missing permission    |

    Scenario: A dependency never gives a permission
      Given the branch holds "CRM key" under project "Platform"
      And the destination does not hold "CRM key"
      And the user may not create a credential in project "Platform" on the destination
      When the user applies project "Sales"
      Then the Apply creates no credential for the user

  Rule: Selecting a credential in a Promote needs read access to it

    Scenario: The user cannot read a credential of the project
      Given the user may promote project "Platform"
      And the user cannot read "CRM key"
      When the user opens the Promote of project "Platform"
      Then the selection does not offer credential "CRM key"

  Rule: A user who cannot read all credentials gets no reason for a credential that is not found

    Scenario: The Apply does not say whether the credential is missing or hidden
      Given the user does not hold the right to read all credentials on the destination
      And the Apply does not find "CRM key" for that user
      When the user applies project "Sales"
      Then the step says: "missing or not accessible, ask an administrator"
      And the step offers no creation of "CRM key"
