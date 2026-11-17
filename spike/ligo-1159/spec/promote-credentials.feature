# Source: solution.md sections 1, 3.2, 3.3, 3.7 and 3.13.
Feature: Credentials in a project Promote
  The branch path is the owner of a credential. A credential is on the branch
  only when its file is under the folder of a team project.

  The owner team promotes a credential, or a user who can promote the owner
  project includes it. A consumer team without that right never writes it.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And credential "CRM key" is in project "Platform" on the source
    And workflow "Sync orders" of project "Sales" uses credential "CRM key"

  Rule: A project Promote can select the credentials that the project owns

    Scenario: The owner team promotes a credential that only other projects use
      Given no workflow of project "Platform" uses "CRM key"
      When the user promotes credential "CRM key" from project "Platform"
      Then the Promote writes "CRM key" to the branch under project "Platform"

    Scenario: A project Promote does not offer a credential of another project
      When the user opens the Promote of project "Sales"
      Then the selection does not offer credential "CRM key"

    Scenario Outline: Each surface can select a credential
      When the user promotes credential "CRM key" from project "Platform" through the <surface>
      Then the Promote writes "CRM key" to the branch under project "Platform"

      Examples:
        | surface    |
        | UI         |
        | public API |
        | CLI        |

  Rule: A Promote never writes a credential at the top level of the branch

    Scenario: A consumer project does not write the credential of another project
      Given the promote environment is strict
      And the branch does not hold "CRM key"
      And the user cannot promote project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the branch holds no file for "CRM key"

    Scenario: A user who can promote the owner project includes the credential
      Given the branch does not hold "CRM key"
      And the user can promote the projects "Sales" and "Platform"
      When the user includes "CRM key" and promotes "Sync orders"
      Then the Promote writes "CRM key" to the branch under project "Platform"
      And the Promote writes "Sync orders" to the branch under project "Sales"

    Scenario: A consumer project does not change a credential that is on the branch
      Given the branch holds credential "CRM key" under project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the file of "CRM key" on the branch does not change

  Rule: The preview of the owner project lists its credentials that the branch needs

    Scenario: A workflow on the branch uses a credential that the branch does not hold
      Given the branch holds "Sync orders" under project "Sales"
      And the branch does not hold "CRM key" under a project
      And the user can access project "Sales"
      When the user previews the Promote of project "Platform"
      Then the preview lists "CRM key" as a credential that project "Sales" uses on the branch

    Scenario: The preview gives a count for a consumer project that the user cannot access
      Given the branch holds "Sync orders" under project "Sales"
      And the branch does not hold "CRM key" under a project
      And the user cannot access project "Sales"
      When the user previews the Promote of project "Platform"
      Then the preview lists "CRM key" with the text "1 project that you cannot access uses it on the branch."
      And the preview does not name project "Sales"
      And the preview does not name workflow "Sync orders"

  Rule: A global credential travels as a credential of its owner team project

    Scenario: The global state of a credential does not travel
      Given "CRM key" is a global credential on the source
      When the user promotes credential "CRM key" from project "Platform"
      Then the Promote writes "CRM key" to the branch under project "Platform"
      And the branch does not record that "CRM key" is global

    Scenario: A workflow that uses a global credential follows the rule of a team credential
      Given "CRM key" is a global credential on the source
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "CRM key"

  Rule: A credential with the usage scope "instance" stays out of the package

    Scenario: The Promote writes no file for the credential
      Given credential "Instance SMTP" has the usage scope "instance" on the source
      And a workflow of project "Sales" names credential "Instance SMTP"
      When the user promotes that workflow from project "Sales"
      Then the package records that the workflow needs "Instance SMTP"
      And the branch holds no file for "Instance SMTP"
      And the report shows the note: "An instance credential is not promoted. It must exist on the destination."
      And the report shows no gap for "Instance SMTP"

  Rule: The check finds a credential by id under any project folder

    Scenario: The owner of a credential changes on the source
      Given the branch holds credential "CRM key" under project "Platform"
      And "CRM key" now belongs to project "Ops" on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

    Scenario: A Promote of the new owner moves the credential on the branch
      Given the branch holds credential "CRM key" under project "Platform"
      And "CRM key" now belongs to project "Ops" on the source
      When the user promotes credential "CRM key" from project "Ops"
      Then the branch holds "CRM key" under project "Ops"
      And the branch does not hold "CRM key" under project "Platform"

    Scenario: A credential id under two project folders stops the Promote
      Given the branch holds credential "CRM key" under project "Platform"
      And the branch holds credential "CRM key" under project "Ops"
      And the user can access the projects "Platform" and "Ops"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the message names the folders of project "Platform" and project "Ops"

  Rule: A placeholder is never content

    @open-decision-6
    Scenario: The Promote does not write a placeholder to the branch
      Given an incomplete Apply created the placeholder "CRM key" in project "Platform" on the source
      And nobody saved values in "CRM key"
      When the user promotes credential "CRM key" from project "Platform"
      Then the branch holds no file for "CRM key"

    @open-decision-6
    Scenario: A reference to a placeholder is a gap
      Given an incomplete Apply created the placeholder "CRM key" in project "Platform" on the source
      And nobody saved values in "CRM key"
      And the branch does not hold "CRM key"
      When the user previews the Promote of "Sync orders" from project "Sales"
      Then the report shows a gap for "CRM key"
