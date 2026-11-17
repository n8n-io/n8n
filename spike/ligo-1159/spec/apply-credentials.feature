# Source: solution.md sections 1, 3.7 and 3.12.
Feature: Credentials on Apply
  A credential lives in the project that owns it. Apply creates a missing
  credential one time, in the owner project that the branch names. A consumer
  project gets access through a grant that the user confirms. Apply never
  removes a share. Git holds no sharing list.

  The owner on the destination follows the branch: when Apply writes a
  credential that the branch places in another project than the destination,
  Apply moves it to the project of the branch and keeps every share.

  Background:
    Given the branch holds credential "CRM key" under project "Platform"
    And the branch holds workflow "Sync orders" under project "Sales"
    And "Sync orders" uses "CRM key"
    And the destination has the team projects "Sales" and "Platform"

  Rule: A credential that a consumer project can use passes

    Scenario: The consumer project can use the credential
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" can use "CRM key" on the destination
      When the user applies project "Sales"
      Then the Apply imports "Sync orders"
      And the report shows no gap

    Scenario: An Apply of a consumer project does not move the credential
      Given the destination holds "CRM key" in project "Ops"
      And project "Sales" can use "CRM key" on the destination
      When the user applies project "Sales"
      Then the Apply imports "Sync orders"
      And "CRM key" stays in project "Ops" on the destination

  Rule: The owner on the destination follows the branch

    Scenario: An Apply of the owner project moves the credential and keeps every share
      Given the destination holds "CRM key" in project "Ops"
      And "CRM key" is shared with project "Sales" on the destination
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination
      And "CRM key" keeps its id
      And project "Sales" can still use "CRM key"
      And project "Ops" can still use "CRM key"

    Scenario: The Apply updates the credential after the move
      Given the destination holds "CRM key" in project "Ops"
      And the name of "CRM key" on the branch differs from the destination
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination
      And the Apply updates the name and the expression values of "CRM key" from the branch

    Scenario: A placeholder gets its home
      Given an incomplete Apply of project "Sales" created the empty placeholder "CRM key" in project "Sales"
      And a user promoted credential "CRM key" from project "Platform"
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination
      And project "Sales" can still use "CRM key"
      And the Apply writes the values of "CRM key" from the branch

    @open-decision-3
    Scenario: A secret typed into the placeholder survives the move
      Given the empty placeholder "CRM key" is in project "Sales" on the destination
      And a destination admin typed a secret value into "CRM key"
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination
      And "CRM key" keeps the secret value that the admin typed

    Scenario: The owner of a credential changed on the source
      Given the destination holds "CRM key" in project "Platform"
      And "CRM key" now belongs to project "Ops" on the source
      And a user promoted credential "CRM key" from project "Ops"
      When the user applies project "Ops"
      Then "CRM key" is in project "Ops" on the destination
      And project "Platform" can still use "CRM key"

    Scenario: A move made by hand on the destination is undone
      Given the destination holds "CRM key" in project "Platform"
      And a destination admin moved "CRM key" to project "Ops" in the editor
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination

    Scenario: The move needs the rights of the user in the project of the branch only
      Given the destination holds "CRM key" in project "Ops"
      And the user cannot access project "Ops"
      And the user may create and update credentials in project "Platform"
      When the user applies project "Platform"
      Then "CRM key" is in project "Platform" on the destination

    Scenario: The preview announces the move without naming a project that the user cannot access
      Given the destination holds "CRM key" in project "Ops"
      And the user cannot access project "Ops"
      When the user previews the Apply of project "Platform"
      Then the preview says: "CRM key moves into Platform. The projects that use it keep access."
      And the preview does not name project "Ops"

    Scenario: The members of the old owner project become users of the credential
      Given the destination holds "CRM key" in project "Sales"
      And a member of project "Sales" could edit "CRM key"
      When the user applies project "Platform"
      Then the member of project "Sales" can use "CRM key"
      And the member of project "Sales" cannot edit "CRM key"

    Scenario Outline: Some credentials never move
      Given the destination holds "CRM key" in project "Ops"
      And "CRM key" is <kind> on the destination
      When the user applies project "Platform"
      Then "CRM key" stays in project "Ops" on the destination

      Examples:
        | kind                                |
        | a managed credential                |
        | an end-user credential              |
        | a credential with usage scope "instance" |

  Rule: A missing credential is created one time in its owner project

    Scenario: The Apply stops and names the owner project and the consumer project
      Given the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the report shows that "CRM key" is missing
      And the report names project "Platform" as the owner on the branch
      And the report names project "Sales" as the consumer

    Scenario: The user creates the credential in the owner project
      Given the destination does not hold "CRM key"
      And the Apply of project "Sales" stopped on the missing credential "CRM key"
      When the user adds "CRM key" in project "Platform" and enters the secret values
      Then the destination holds "CRM key" in project "Platform" with the id of the source
      And the Apply lists this access to grant: "CRM key" for project "Sales"

    Scenario: The user grants access and the Apply imports
      Given the user created "CRM key" in project "Platform" on the destination
      And the Apply lists this access to grant: "CRM key" for project "Sales"
      When the user confirms the grant and continues
      Then the Apply shares "CRM key" with project "Sales"
      And the Apply imports "Sync orders"
      And the result lists the grant

    Scenario: Several consumer projects give one credential to create
      Given the branch holds workflow "Page engineer" under project "Ops"
      And "Page engineer" uses "CRM key"
      And the destination does not hold "CRM key"
      When the user starts an instance Apply
      Then the Apply reports one missing credential "CRM key"
      And the Apply names the projects "Sales" and "Ops" as consumers of that credential
      And the user creates "CRM key" one time

    Scenario: The Apply dialog offers only the owner project as the home
      Given the destination does not hold "CRM key"
      When the user applies project "Sales" in the UI
      Then the step to add "CRM key" offers project "Platform" only

    Scenario: A credential is never created in a personal project
      Given the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then no step offers a personal project as the home of "CRM key"

    Scenario: The server accepts a credential that a client created in another project
      Given the destination does not hold "CRM key"
      And a public API client created "CRM key" with the id of the source in project "Sales"
      When the client applies project "Sales"
      Then the Apply treats "CRM key" as a credential that exists on the destination
      And the Apply imports "Sync orders"

  Rule: The Apply offers a way forward when the owner project is not on the destination

    Scenario: The owner project is on the branch and not on the destination
      Given the destination does not have project "Platform"
      And the destination does not hold "CRM key"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the step for "CRM key" offers these actions: "Create project Platform" and "Apply project Platform first"

  Rule: A consumer project gets access through a grant that the user confirms

    Scenario: The credential exists and the consumer project cannot use it
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" cannot use "CRM key" on the destination
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the Apply lists this access to grant: "CRM key" for project "Sales"
      And the Apply says whether the user may grant it

    Scenario: One Continue grants access and applies
      Given the Apply lists this access to grant: "CRM key" for project "Sales"
      And the user may share "CRM key"
      When the user confirms the grant and continues
      Then the Apply shares "CRM key" with project "Sales"
      And the Apply imports "Sync orders"
      And the result lists the grant

    Scenario: The first Apply call grants nothing
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" cannot use "CRM key" on the destination
      When the user applies project "Sales"
      Then the Apply shares no credential

    Scenario: The Apply grants only the items that the user confirmed
      Given the Apply lists these accesses to grant:
        | credential | project |
        | CRM key    | Sales   |
        | Mail key   | Sales   |
      When the user confirms only the grant of "CRM key" for project "Sales" and continues
      Then the Apply shares "CRM key" with project "Sales"
      And the Apply does not share "Mail key"
      And the Apply stops on the access of "Mail key"

    Scenario: The Apply does not grant an access that the check does not need
      Given project "Sales" can use "CRM key" on the destination
      When a client continues the Apply with a grant of "CRM key" for project "Ops"
      Then the Apply does not share "CRM key" with project "Ops"

    Scenario: A grant writes the same audit event as a share in the editor
      Given the Apply lists this access to grant: "CRM key" for project "Sales"
      When the user confirms the grant and continues
      Then the audit log holds the event that a share of "CRM key" in the editor writes

    Scenario Outline: Each surface can grant access
      Given the Apply lists this access to grant: "CRM key" for project "Sales"
      And the user may share "CRM key"
      When the user confirms the grant and continues through the <surface>
      Then the Apply shares "CRM key" with project "Sales"

      Examples:
        | surface    |
        | UI         |
        | public API |
        | CLI        |

  Rule: A grant needs the right to share, the sharing licence and an API key scope

    Scenario: The user may not share the credential
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" cannot use "CRM key" on the destination
      And the user may not share "CRM key"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the Apply offers no grant for "CRM key"
      And the row of "CRM key" says who can grant access

    Scenario: The instance has no sharing licence
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" cannot use "CRM key" on the destination
      And the destination has no sharing licence
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the access of "CRM key" for project "Sales" stays a block with the licence as the reason

    Scenario: An API key without the grant scope cannot grant access
      Given the Apply lists this access to grant: "CRM key" for project "Sales"
      And the API key of the client does not hold the scope that allows a grant
      When the client confirms the grant and continues
      Then the Apply shares no credential
      And the Apply stops on the access of "CRM key"

  Rule: Apply never removes a share

    Scenario: A share on the destination that the branch does not need stays
      Given the destination holds "CRM key" in project "Platform"
      And "CRM key" is shared with the projects "Sales" and "Ops" on the destination
      And no workflow of project "Ops" on the branch uses "CRM key"
      When the user starts an instance Apply
      Then "CRM key" is still shared with project "Ops" on the destination

  Rule: Apply updates a credential only from the project that owns it on the branch

    Scenario: An Apply of the owner project updates the credential from the branch
      Given the destination holds "CRM key" in project "Platform"
      And the name of "CRM key" on the branch differs from the destination
      When the user applies project "Platform"
      Then the Apply updates the name and the expression values of "CRM key" from the branch

    Scenario: An Apply of a consumer project does not change the credential
      Given the destination holds "CRM key" in project "Platform"
      And project "Sales" can use "CRM key" on the destination
      And the name of "CRM key" on the branch differs from the destination
      When the user applies project "Sales"
      Then "CRM key" does not change on the destination

  Rule: The global state of a credential does not travel

    Scenario: A credential that is global on the source is not global on a new destination
      Given "CRM key" is a global credential on the source
      And the destination does not hold "CRM key"
      When the user applies project "Sales" and creates "CRM key" in project "Platform"
      Then "CRM key" is not global on the destination
      And project "Sales" gets access through a grant that the user confirms

  Rule: A credential with the usage scope "instance" blocks the Apply

    Scenario: The destination holds the credential with the usage scope "instance"
      Given the destination holds "CRM key" with the usage scope "instance"
      When the user applies project "Sales"
      Then the Apply stops before any write
      And the Apply reports that the usage scope of "CRM key" is not compatible
