# QA checklist: cross-project promotion

Status: draft 1, 2026-11-24. Use after the work in `ux-handoff.md` is done.

## How to run it

1. Open the Playground next to the real product. The Playground is at Settings,
   Environments Playground.
2. For each scenario, set the amount to **Few**, then **Some**, then **Many**.
3. Set up the same case in the real product. Compare what you see.
4. Tick a box when the real product matches. Write a note when it does not.
5. A difference is either a bug in the product, or a gap in the Playground. Decide which,
   and fix that one.

Check each item in light and dark mode. Check the narrow width of the Promote dialog once.

Result per run: `pass`, `fail`, or `n/a`.

## Everywhere

- [ ] The tab is called **Issues**. The count shows `0` when there are none.
- [ ] The words "blocker", "gap" and "binding" do not appear.
- [ ] No owner name appears anywhere.
- [ ] The copy matches `ux-content.md`. Read each string, not only the layout.
- [ ] Every icon has a tooltip. The tooltip text explains the reason.
- [ ] Every action has a label that names what it does.
- [ ] No layout shift when the list loads or when the selection changes.

## P1 / A1: Nothing is missing

- [ ] The page looks the same as it did before this work.
- [ ] No Issues section, no warning icon, no lock.
- [ ] The Issues tab shows `0`.
- [ ] The button enables and runs without a confirmation about dependencies.

## P2 / A3: Dependencies outside your access

Tree:
- [ ] Each outside dependency is the last item of its group.
- [ ] The checkbox is disabled. The text is muted. A lock sits at the right.
- [ ] The lock tooltip says the user has no permission to promote (or apply) it.
- [ ] The group heading reads **Workflows (N)**. N includes the outside items.
- [ ] Select all does not select an outside item.
- [ ] A workflow with an outside dependency has a muted warning icon at the right. No row
      highlight.
- [ ] The warning tooltip says that the user can promote (or apply) it without them.
- [ ] An outside workflow is under a project row. A known project shows its name.
- [ ] A hidden project shows **Other projects**, and that row is last.

Issues tab:
- [ ] Only the **Outside your access** section shows. It has the count.
- [ ] The description says that the user can continue without them.
- [ ] Each row says "Used by ..." and does not offer an action.

Button and dialog:
- [ ] The button is enabled.
- [ ] Promote opens the commit message dialog. The title is "Promote N changes?".
- [ ] Apply opens one dialog. The title is "Apply N changes?".
- [ ] The warning shows above the message field (Promote) or in the body (Apply).
- [ ] The sentence names the workflows, with the right verb for the page.
- [ ] Each workflow lists "Missing A, B and N more." The list scrolls after 14rem.
- [ ] The divider shows above and below the list.
- [ ] There is more space above the commit message field than without the warning.
- [ ] The confirm button repeats the label of the page button.

## P3: Credential in a personal project (Promote)

- [ ] The credential shows under "Cannot be promoted".
- [ ] The lock tooltip says to move the credential to a team project.
- [ ] The dialog does not say "personal project". It follows the standard warning.
- [ ] On Apply, the same credential reads: "This credential is in a personal project."

## P4: The list changes before you promote

- [ ] Click Promote. The page shows that the list has changed.
- [ ] Nothing was promoted.
- [ ] The new list shows the new issues.
- [ ] The selection the user made is kept.

## A2: Dependencies you can resolve

- [ ] The **Needs your action** section shows, with the count and its description.
- [ ] Each row has the actions: add a credential or variable, or use a placeholder.
- [ ] A workflow with an issue is **selectable**.
- [ ] Apply is **disabled**, with a message that says to resolve the issues or clear the
      changes.
- [ ] Resolving the last issue enables Apply.
- [ ] The marker on the workflow is amber and has the right tooltip.
- [ ] After creating a credential, the list refreshes. The Issues count goes down.

## A4: Both kinds at once

- [ ] Both sections show: Needs your action first, Outside your access second.
- [ ] The counts of the sections add up to the tab count.
- [ ] Apply is disabled until the first kind is resolved.
- [ ] After that, Apply opens the confirmation for the second kind.
- [ ] A workflow with both kinds has one marker. The tooltip names both counts.

## Selection (Sandra)

- [ ] On load, every selectable workflow is selected.
- [ ] No checkbox looks disabled, except an outside dependency.
- [ ] Selecting a workflow includes its dependencies.
- [ ] Clearing a dependency clears the workflows that need it.
- [ ] A sub-workflow that a workflow calls is not included until the user selects it.
- [ ] A shared data table stays included while any selected workflow uses it.
- [ ] Tags cannot be selected.
- [ ] A refresh keeps the selection. A workflow that is no longer listed is reported.
- [ ] While the operation runs, every checkbox is locked.
- [ ] No "x selected" text anywhere.

## B1: Review with missing dependencies

- [ ] The **Changes** tab shows the number of changes.
- [ ] The **Issues** tab shows only when something is missing. It shows its count.
- [ ] The intro says that these dependencies are not part of this promotion.
- [ ] The rows use the "Outside your access" row.
- [ ] The Issues tab does not show when nothing is missing.
- [ ] The approve dialog shows the warning, with the Promote wording.
- [ ] Approve works. The review state changes to merged.
- [ ] Close works. The review state changes to closed.
- [ ] The dialogs have a backdrop over the whole window, sidebar included.
- [ ] A review that cannot be read shows the error and **Try again**.

## Amounts

For each scenario above, check Few, Some and Many.

- [ ] **Few:** the layout is not sparse or broken with one or two items.
- [ ] **Some:** the layout is the reference.
- [ ] **Many:** the lists scroll. Nothing overflows. The counts stay correct. "and N
      more" appears where it should.

## Differences found

| Scenario | Amount | Difference | Fix in |
|---|---|---|---|
| | | | Product / Playground / Docs |
