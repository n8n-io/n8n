# Source: solution.md sections 3.10 and 3.11, with the move rules of the previous
# revision and of consolidated-solution.md (sections 4.5 and 5.9).
Feature: Moves between projects
  A move of a workflow or a folder between two team projects is one change.
  Apply transfers the item and keeps its id, its history and its executions.

  Background:
    Given the source has the team projects "Sales" and "Ops"
    And the branch holds workflow "Sync orders" under project "Sales"
    And a user moved "Sync orders" from project "Sales" to project "Ops" on the source

  Rule: Promote writes a move between two team projects as one change

    Scenario: The preview shows one moved row
      When the user previews the Promote of project "Ops"
      Then the preview shows one row for "Sync orders": "Moved from Sales to Ops"
      And the preview does not show a deletion and a creation for "Sync orders"

    Scenario Outline: The moved row is on the page of each project
      When the user previews the Promote of project "<project>"
      Then the user can select the moved row of "Sync orders"

      Examples:
        | project |
        | Sales   |
        | Ops     |

    Scenario: A project Promote writes both sides in one commit
      When the user promotes the move of "Sync orders" from project "Ops"
      Then one commit removes "Sync orders" under project "Sales" and adds it under project "Ops"

    Scenario: An instance Promote writes the move
      When the user starts an instance Promote
      Then the branch holds "Sync orders" under project "Ops"
      And the branch does not hold "Sync orders" under project "Sales"

  Rule: Apply transfers the item when the operation holds both projects

    Background:
      Given the branch holds "Sync orders" under project "Ops" after the Promote of the move
      And the destination holds "Sync orders" in project "Sales"

    Scenario: An instance Apply transfers the workflow and keeps the id
      When the user starts an instance Apply
      Then "Sync orders" is in project "Ops" on the destination
      And "Sync orders" keeps its id, its history and its executions
      And the Apply deletes nothing in project "Sales" because of the move

    Scenario: The transfer keeps the publish state of the destination
      Given "Sync orders" is published on the destination
      When the user starts an instance Apply
      Then "Sync orders" is still published on the destination

    Scenario: A project Apply says that it changes two projects
      When the user previews the Apply of the moved row of "Sync orders"
      Then the preview shows one moved row
      And the preview says that the Apply changes the projects "Sales" and "Ops"

    Scenario: The API response names the other project
      When a public API client previews the Apply of the moved row of "Sync orders"
      Then the response names the projects "Sales" and "Ops"

    Scenario Outline: The moved row is one operation from either project
      When the user applies the moved row of "Sync orders" from project "<project>"
      Then "Sync orders" is in project "Ops" on the destination

      Examples:
        | project |
        | Sales   |
        | Ops     |

    Scenario: The moved workflow loses its shares
      Given "Sync orders" is shared with a user on the destination
      When the user previews the Apply of the moved row of "Sync orders"
      Then the preview says that "Sync orders" loses its shares
      When the user applies the moved row
      Then "Sync orders" has no share on the destination

  Rule: A folder moves with its whole subtree

    Scenario: A moved folder takes its workflows and its folders with it
      Given a user moved folder "Orders" from project "Sales" to project "Ops" on the source
      And the branch holds folder "Orders" under project "Ops" after the Promote of the move
      And the destination holds folder "Orders" in project "Sales"
      When the user starts an instance Apply
      Then folder "Orders" and its whole subtree are in project "Ops" on the destination

  Rule: A move out of a project that the package does not hold needs an instance Apply

    Background:
      Given a user deleted project "Sales" on the source after the move
      And an instance Promote wrote the branch
      And the branch holds "Sync orders" under project "Ops"
      And the branch does not hold project "Sales"
      And the destination holds "Sync orders" in project "Sales"

    Scenario: A project Apply refuses the move
      When the user applies "Sync orders" of project "Ops"
      Then the Apply stops before any write
      And the Apply reports that "Sync orders" moved

    Scenario: An instance Apply shows the move and the old project
      When the user previews an instance Apply
      Then the preview shows one moved row for "Sync orders" that names project "Sales"
      And the preview says that the Apply moves "Sync orders" out of project "Sales"
      And the preview lists project "Sales" for deletion

    Scenario: The transfer runs before the project deletion
      When the user confirms the destructive changes of the instance Apply
      Then the Apply transfers "Sync orders" to project "Ops"
      And then the Apply deletes project "Sales"
      And "Sync orders" is in project "Ops" on the destination

  Rule: A move never goes into a personal project

    Scenario: Promote refuses a move into a personal project
      Given a user moved workflow "Daily report" from project "Sales" to the personal project of Alice on the source
      When the user starts an instance Promote
      Then the Promote stops
      And the Promote names "Daily report" and the move into a personal project

    Scenario: Apply keeps the block when the destination holds the item in a personal project
      Given the branch holds "Sync orders" under project "Ops" after the Promote of the move
      And the destination holds "Sync orders" in a personal project
      When the user starts an instance Apply
      Then the Apply stops before any write
      And the Apply reports that "Sync orders" moved

    Scenario: A move out of a personal project gives a new workflow
      Given Alice moved workflow "Alice's helper" from a personal project to project "Ops" on the source
      When the user promotes "Alice's helper" from project "Ops"
      Then the Promote treats "Alice's helper" as a new workflow
      And the dependencies of "Alice's helper" follow the rules of the Promote check

  Rule: Credentials do not move with a workflow

    Scenario: The credentials of a moved workflow are dependencies in the new project
      Given "Sync orders" uses credential "Sales key" of project "Sales"
      And the branch holds "Sync orders" under project "Ops" after the Promote of the move
      And the destination holds "Sales key" in project "Sales"
      And project "Ops" cannot use "Sales key" on the destination
      When the user starts an instance Apply
      Then "Sales key" stays in project "Sales" on the destination
      And the Apply lists this access to grant: "Sales key" for project "Ops"

    Scenario: The old project stays while a moved workflow uses its credential
      Given "Sync orders" uses credential "Sales key" of project "Sales"
      And a user deleted project "Sales" on the source after the move
      And an instance Promote wrote the branch
      And the branch holds "Sync orders" under project "Ops"
      And the destination holds "Sales key" and "Sync orders" in project "Sales"
      When the user starts an instance Apply
      Then the Apply does not delete project "Sales"
      And the Apply shows a warning that names project "Sales" and "Sales key"

  Rule: A move needs the rights of the editor move

    Scenario: The user may not move the workflow
      Given the branch holds "Sync orders" under project "Ops" after the Promote of the move
      And the destination holds "Sync orders" in project "Sales"
      And the user may not move "Sync orders" on the destination
      When the user applies the moved row of "Sync orders"
      Then the Apply stops before any write
      And the Apply names the missing permission
