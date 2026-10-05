# PROTOTYPE: workspaces

Throwaway prototype on the `prototype/workspaces` branch. Do not merge it.

## Question

Can a "workspace" replace today's team projects as the sidebar unit, and does
this resource model feel right?

- A workspace holds credentials, data tables and variables. It holds no workflows.
- A project lives in a workspace. It can use its own resources, its workspace's
  resources and the instance-wide resources. It cannot use a sibling project's resources.
- Instance admins see every workspace. Joining or leaving only changes their sidebar.
- Other users see every workspace too. They join a public workspace as a viewer.
  To join a private one, they request access from its admins.
- Each workspace chooses whether its members get every project in it, or must be
  added to each project.
- Each user has a personal workspace. Its projects hold the user's workflows.
  A security policy can turn personal spaces off for the whole instance.

## Run it

```bash
pnpm build > build.log 2>&1        # once, or after you change backend code
pnpm prototype:workspaces          # http://localhost:5700
pnpm prototype:workspaces --reset  # wipe the prototype data and seed again
```

The data lives in `.prototype-workspaces-WIPE-ME/`. Your dev database is not used.
Licensed features come from the E2E test controller, so the red "E2E MODE" banner shows.
Every seeded user has the password `Prototype123`.

| User | What to look at |
|---|---|
| `owner@acme.test` | Sidebar shows Finance and Marketing. Join Engineering from the **+** next to **Workspaces** in the sidebar. |
| `admin@acme.test` | Joined Marketing only. Finance and Engineering are one click away. |
| `alice@acme.test` | Finance workspace admin. Sees Finance, but only the project she created, because Finance adds members to each project. |
| `bob@acme.test` | Payroll editor. Finance shows Payroll only. Bob can join Marketing (public) and request access to Engineering (private). |
| `carol@acme.test` | Invoicing editor and Marketing editor. Marketing gives its members every project, so Carol gets Campaigns and Website. Cannot use Payroll's credential. |

Walkthrough:

1. As Bob, open **Payroll → Credentials**. The chips show what Payroll inherits.
2. Open **Inheritance demo** and run it. `REGION` comes from Finance (it overrides
   the instance value), `SUPPORT_EMAIL` comes from the instance, the table comes
   from Finance and the HTTP node uses Finance's credential.
3. As Carol, run **Sibling leak**. It fails: Payroll's credential is not in Invoicing's chain.
4. As any user, click **+** next to **Workspaces**, then **Request access** on **Legal**.
   Legal is a demo row that exists only in the browser, so even instance admins see the
   flow. The request is not sent anywhere. The button changes to "Request sent".
   As Bob, Engineering also needs a request, and Marketing has a **Join** button.
5. As Admin, open **Marketing → Workspace settings → Access**. Turn **Public workspace** off,
   or switch **Project access for members**. Campaigns' members list marks Carol "From workspace".
6. As Owner, open **Settings → Security & policies** and turn off **Personal spaces**. The
   Personal workspace leaves everyone's sidebar, and new workflows, credentials and data
   tables in personal spaces are rejected.

## How it is built

- `project.type` gets `workspace`, `personalWorkspace` and `instance`. A new
  `project.parentId` column links a project to its workspace.
- `project.isPublic` and `project.cascadeMembers` hold the access options.
  The cascade writes `project_relation` rows on each child project, tagged with
  `inheritedFromId`, so every existing access check works without changes.
- The personal spaces policy is the `security.personalSpacesEnabled` setting.
- `ProjectHierarchyService` (`packages/cli/src/services/project-hierarchy.service.ts`)
  returns the resource chain: project, workspace, instance.
- The chain is used in the pre-execution credential check, the node credential
  picker, workflow save validation, load options, `$vars` and the Data Table node.
- `packages/cli/src/modules/workspaces/` has the REST API and a startup bootstrap
  that puts existing projects into workspaces.

## Shortcuts

- Other users' personal workspaces are hidden from admins, but the projects in
  them still appear in admins' project lists.
- The settings page for a workspace still says "Project info" and "Project members".
- "Request access" only remembers the request in the browser. No admin sees it.
- Removing a cascaded member from a project adds them again. Changing their role on
  the project replaces the workspace role.
- With personal spaces off, existing personal content is still reachable by link and
  in the overview. The policy has no env variable or public API field.
- Moving a project between workspaces is not supported.
- The existing global credentials and global variables still work next to the
  new instance scope. A real build would merge them.
- No tests.
