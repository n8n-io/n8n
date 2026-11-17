# Source: solution.md sections 1 (decision 13), 3.2 and 3.3. Behavior kept
# from the previous revision.
Feature: Promote of a deletion
  A deletion can break a reference that other content on the branch holds.
  The source already has the same broken reference, so the Promote warns and
  continues.

  Background:
    Given the source has the team projects "Sales" and "Ops"
    And the branch holds workflow "Notify on-call" under project "Ops"
    And the branch holds workflow "Daily report" under project "Sales"
    And "Daily report" calls "Notify on-call"

  Rule: A deletion that breaks a reference on the branch is a warning

    Scenario: The preview names the caller on the branch
      Given a user deleted "Notify on-call" on the source
      And the user can access project "Sales"
      When the user previews the Promote of the deletion from project "Ops"
      Then the preview shows this warning: "Daily report in project Sales calls Notify on-call. The reference of Daily report is broken on the branch."

    Scenario: The preview counts a caller that the user cannot access
      Given a user deleted "Notify on-call" on the source
      And the user cannot access project "Sales"
      When the user previews the Promote of the deletion from project "Ops"
      Then the preview shows a warning: "1 workflow that you cannot access calls it."
      And the preview does not name "Daily report" or project "Sales"

    Scenario: The Promote continues
      Given a user deleted "Notify on-call" on the source
      When the user promotes the deletion from project "Ops"
      Then the Promote removes "Notify on-call" from the branch
      And the branch still holds "Daily report" under project "Sales"
      And the reference of "Daily report" is broken on the branch as it is on the source
