# Source: solution.md sections 3.6, 3.12 and 9 (decision 1).
Feature: Ask the owner
  A gap in a project that the user cannot access offers "Ask the owner". The
  request goes to the owner project. The requester gets no information about
  the owner project. The request stores the operation and the environment.

  Background:
    Given the source has the team projects "Sales", "Platform" and "Ops"
    And workflow "Sync orders" of project "Sales" uses credential "CRM key" of project "Platform"
    And the branch does not hold "CRM key"
    And the user can access project "Sales" only

  Rule: The request goes to the inbox of the owner project

    Scenario: The user asks the owner
      When the user previews the Promote of "Sync orders" from project "Sales"
      And the user selects "Ask the owner" on the gap of "CRM key"
      Then the promotion inbox of project "Platform" holds a request for "CRM key"
      And the user sees "Request sent"

    Scenario: The requester gets no information about the owner project
      When the user selects "Ask the owner" on the gap of "CRM key"
      Then the confirmation does not name project "Platform"
      And the confirmation does not say who received the request

    @open-decision-1
    Scenario: The admins of the owner project receive the request
      When the user selects "Ask the owner" on the gap of "CRM key"
      Then the admins of project "Platform" see the request in their inbox

    @open-decision-1
    Scenario: The request shows the resource and the requester
      Given the user asked the owner for "CRM key"
      When an admin of project "Platform" opens the request
      Then the request shows credential "CRM key"
      And the request shows the requesting user
      And the request shows the operation
      And the request does not name project "Sales"

    Scenario: The request stores the operation and the environment
      When the user selects "Ask the owner" on the gap of "CRM key" in the Promote of "Sync orders"
      Then the request stores the operation "Promote"
      And the request stores the promote environment

  Rule: The request leads to a normal Promote of the owner project

    Scenario: The owner team promotes the requested resource
      Given the user asked the owner for "CRM key"
      When an admin of project "Platform" opens the request
      Then the request offers the Promote of "CRM key" from project "Platform"

    Scenario: The gap closes after the owner promotes
      Given the user asked the owner for "CRM key"
      And a user promoted credential "CRM key" from project "Platform"
      When the user promotes "Sync orders" from project "Sales"
      Then the Promote writes "Sync orders" to the branch under project "Sales"

  Rule: Apply offers the same request

    Scenario: A gap on Apply in a project that the user cannot apply
      Given the branch holds "Sync orders" under project "Sales"
      And the branch holds workflow "Notify on-call" under project "Ops"
      And "Sync orders" calls "Notify on-call"
      And the destination does not hold "Notify on-call"
      And the user cannot apply project "Ops"
      When the user previews the Apply of "Sync orders" of project "Sales"
      Then the gap of "Notify on-call" offers the action "Ask the owner"

    Scenario: A request from an Apply offers the Apply on that destination
      Given the branch holds workflow "Notify on-call" under project "Ops"
      And the destination does not hold "Notify on-call"
      And project "Ops" is on the destination
      And the user asked the owner for "Notify on-call" from the Apply of "Sync orders"
      When an admin of project "Ops" opens the request
      Then the request offers the Apply of "Notify on-call" on that destination
      And the request does not offer a Promote of "Notify on-call"

    @open-decision-1
    Scenario: The instance admins receive the request when the owner project is not on the destination
      Given the branch holds workflow "Notify on-call" under project "Ops"
      And the destination does not hold project "Ops"
      And the user cannot apply project "Ops"
      When the user selects "Ask the owner" on the gap of "Notify on-call" in the Apply of "Sync orders"
      Then the instance admins of the destination see the request in their inbox
      And the user sees "Request sent"
