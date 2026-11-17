# Source: solution.md section 3.13, and the scope rules of the previous
# revision that the current solution.md keeps.
Feature: What travels and what does not
  Two relations cross a project at run time: the use of a credential and a
  reference to a workflow. Variables and data tables cannot cross a project.
  Tags are instance-wide.

  Background:
    Given the source has the team projects "Sales" and "Ops"
    And workflow "Sync orders" is in project "Sales" on the source

  Rule: Variables travel by scope

    Scenario: A project variable is under the project folder
      Given project "Sales" has the variable "region"
      When a Promote writes the variable "region"
      Then the branch holds the variable "region" under project "Sales"

    Scenario: A global variable is at the top level
      Given the source has the global variable "company"
      When a Promote writes the variable "company"
      Then the branch holds the variable "company" at the top level

    Scenario: A variable must exist in its scope on the destination
      Given the branch holds the variable "region" under project "Sales"
      And the destination does not hold the variable "region" in project "Sales"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the binding step creates the variable "region" in project "Sales"

  Rule: A data table of the own project is content

    Scenario: A data table of the own project is created or matched
      Given "Sync orders" uses data table "Price list" of project "Sales"
      And the branch holds "Sync orders" and data table "Price list" under project "Sales"
      When the user applies project "Sales"
      Then the destination holds data table "Price list" in project "Sales"

  Rule: A data table of another project does not travel

    Scenario: Promote warns about a reference to a data table of another project
      Given "Sync orders" references data table "Shifts" of project "Ops"
      When the user promotes "Sync orders" from project "Sales"
      Then the preview shows a warning that names "Sync orders" and "Shifts"
      And the Promote writes "Sync orders" to the branch under project "Sales"

    Scenario: Apply does not copy the table to the consumer project
      Given the branch holds "Sync orders" under project "Sales"
      And "Sync orders" references data table "Shifts" of project "Ops"
      When the user applies project "Sales"
      Then the Apply imports "Sync orders"
      And the Apply creates no data table in project "Sales"
      And the result shows a warning that names "Sync orders" and "Shifts"

    Scenario: The table in the owner project does not change
      Given the branch holds "Sync orders" under project "Sales"
      And "Sync orders" references data table "Shifts" of project "Ops"
      And the destination holds data table "Shifts" in project "Ops"
      When the user applies project "Sales"
      Then the Apply reports no id conflict
      And data table "Shifts" in project "Ops" does not change

  Rule: Tags are instance-wide

    Scenario: A tag is created at the instance level
      Given "Sync orders" has the tag "billing"
      And the branch holds "Sync orders" under project "Sales"
      And the destination does not hold the tag "billing"
      When the user applies project "Sales"
      Then the destination holds the tag "billing"

  Rule: Workflow sharing does not travel

    Scenario: The package holds no workflow share
      Given "Sync orders" is shared with Alice on the source
      When the user promotes "Sync orders" from project "Sales"
      Then the branch does not record the share of "Sync orders"

    Scenario: The shares on the destination stay
      Given the branch holds "Sync orders" under project "Sales"
      And "Sync orders" is shared with a user on the destination
      When the user applies project "Sales"
      Then "Sync orders" is still shared with that user on the destination

  Rule: A personal project is never content and never a home

    Scenario: The branch holds no personal data
      Given Alice has workflow "Alice's helper" in a personal project
      When the user starts an instance Promote
      Then the branch holds no item of the personal project of Alice

  Rule: Changes to an environment

    Scenario: An environment that points to another repository closes its open reviews
      Given the promote environment has an open review
      When an admin points the environment to another repository
      Then n8n closes the open review

    Scenario: The next operation compares the repository and the instance
      Given an admin changed the branch of the apply environment
      When the user previews an Apply
      Then the preview compares the new branch with the destination

  Rule: The package format does not change

    Scenario: A new Promote writes a package that an older reader can read
      When the user promotes "Sync orders" from project "Sales"
      Then the package has the format version "1"
      And the package holds no file type that the earlier format does not have
