# Source: solution.md sections 1 (decision 6), 3, 4.2, 4.7 and 6.2.
Feature: Credentials in a project Promote
  The branch path is the owner of a credential. A credential is on the branch
  only when its file is under the folder of a team project.

  The owner team promotes a credential. A consumer team never does.

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
      Given the branch does not hold "CRM key"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote stops
      And the branch holds no file for "CRM key"

    Scenario: A consumer project does not change a credential that is on the branch
      Given the branch holds credential "CRM key" under project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
      And the file of "CRM key" on the branch does not change

  Rule: The preview of the owner project lists its credentials that the branch needs

    Scenario: A workflow on the branch uses a credential that the branch does not hold
      Given the branch holds "Sync orders" under project "Sales"
      And the branch does not hold "CRM key" under a project
      When the user previews the Promote of project "Platform"
      Then the preview lists "CRM key" as a credential that project "Sales" uses on the branch

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
      Then "Sync orders" cannot be promoted
      And the preview shows this next step for "CRM key": "Promote credential CRM key from project Platform first."

  Rule: A credential with the usage scope "instance" stays out of the package

    Scenario: The Promote writes no file for the credential
      Given credential "Instance SMTP" has the usage scope "instance" on the source
      And a workflow of project "Sales" names credential "Instance SMTP"
      When the user promotes that workflow from project "Sales"
      Then the package records that the workflow needs "Instance SMTP"
      And the branch holds no file for "Instance SMTP"

  Rule: The check finds a credential by id under any project folder

    Scenario: The owner of a credential changes on the source
      Given the branch holds credential "CRM key" under project "Platform"
      And "CRM key" now belongs to project "Ops" on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"
