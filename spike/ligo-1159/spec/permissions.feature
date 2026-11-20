# Source: solution.md sections 2, 3.1, 3.3, 3.5, 3.7 and 3.12.
Feature: Permissions in promotion
  Promotion acts as the user. It reports, it does not act for the user, and a
  user never sees information about a resource that they cannot access.

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

  Rule: A gap shows only what the workflow of the user already holds

    Scenario: The user cannot read a dependency that is not on the branch
      Given the user cannot read "CRM key"
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows "CRM key" only with the id, the name and the type that the node of "Sync orders" holds
      And the report shows no other information about "CRM key"

    Scenario: A gap names a project only when the user can access it
      Given the user cannot access project "Platform"
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report does not name project "Platform"
      And the gap offers the action "Ask the owner"

  Rule: A target that the user cannot read and that works on the source is a gap, not a warning
    The check resolves a target that the user cannot read. It needs this to
    tell a gap from a broken reference.

    Scenario: The user cannot read a target that works on the source
      Given the user cannot read "CRM key"
      And project "Sales" can use "CRM key" on the source
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "CRM key"
      And the report does not show the warning "This reference is broken."
      And the report shows "CRM key" only with the id, the name and the type that the node of "Sync orders" holds

    Scenario: A target that the check cannot resolve counts as working
      Given the check cannot tell whether project "Sales" can use "CRM key" on the source
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "CRM key"
      And the report does not show the warning "This reference is broken."

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
        | include an item of another project | the right to promote or apply that project                 | the gap offers "Ask the owner"               |

      @open-decision-5
      Examples: Move of a credential with values
        | action                                                   | needs                             | without it                                                                          |
        | move a credential with values to its owner on the branch | credential:move on the credential | "CRM key has another owner on the destination. A user who may move it must apply." |

    Scenario: A dependency never gives a permission
      Given the branch holds "CRM key" under project "Platform"
      And the destination does not hold "CRM key"
      And the user may not create a credential in project "Platform" on the destination
      When the user applies project "Sales"
      Then the Apply creates no credential for the user

  Rule: "Allow incomplete" needs no extra permission

    Scenario: A user who can promote can continue with gaps
      Given "Allow incomplete promotions" is on for the promote environment
      And the user can promote project "Sales"
      When the user confirms the gaps and promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: The move of a credential to its owner on the branch has its own permission check
    An empty credential moves with rights in the project of the branch only. Any
    other credential moves only when the user may move it.

    @open-decision-5
    Scenario: The user cannot access the old owner project
      Given the branch holds "CRM key" under project "Platform"
      And the destination holds the empty credential "CRM key" in project "Ops"
      And the user cannot access project "Ops"
      And the user may create and update credentials in project "Platform"
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination

    @open-decision-5
    Scenario: The user may not create credentials in the project of the branch
      Given the branch holds "CRM key" under project "Platform"
      And the destination holds the empty credential "CRM key" in project "Ops"
      And the user may not create credentials in project "Platform"
      When the user applies project "Platform"
      Then the Apply stops before any write
      And the Apply names the missing permission

    @open-decision-5
    Scenario: The user may not move a credential with values
      Given the branch holds "CRM key" under project "Platform"
      And the destination holds "CRM key" with secret values in project "Ops"
      And the user may create and update credentials in project "Platform"
      And the user may not move "CRM key"
      When the user applies project "Platform"
      Then "CRM key" stays in project "Ops" on the destination
      And the Apply does not update "CRM key"
      And the Apply continues with the other items
      And the result says: "CRM key has another owner on the destination. A user who may move it must apply."

  Rule: The confirmation of an incomplete operation never gives a permission

    Scenario: Confirming the gaps does not give the right to create an empty credential
      Given "Allow incomplete applies" is on for the apply environment
      And the branch does not hold "CRM key"
      And the destination does not hold "CRM key"
      And the user may not create a credential in project "Sales" on the destination
      When the user confirms the gaps and applies project "Sales"
      Then the Apply creates no empty credential for "CRM key"
      And the Apply stops on "CRM key"

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
