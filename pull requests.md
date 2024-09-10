This PR is rather big.
It does contain TODOs and functions that miss implementation. I'm aware of that, but still find that getting this into trunk now and creating smaller PRs for the TODOs and missing functionality will make future reviewing easier.

It's mostly new files that connect with the old code via one feature gate in the `POST /workflows/run` controller/service.
The new functionality should not have an effect on the old code.

The new code follows the spec written here: https://www.notion.so/n8n/Partial-Executions-9f24ffe8c6474eaeab51c9784ad1fd46?p=4298d34eb54f42e1baa098c9ccc50b5a&pm=s

Changes to the old code are kept to a minimum to avoid breaking the old partial execution flow. The goal is to remove all old code after the new partial executions flow saw enough testing.

I also added some comments to parts of the code that I did not immediately understand.

## Important Review Notes

It's best to start reviewing with this file: packages/core/src/WorkflowExecute.ts

Everything in `cypress/*` is only done to make the interceptors still work with `POST /workflow/run` having a query parameter now.

All the new code including the tests are in `packages/core/src/PartialExecutionUtils` neatly separated by modules that align with the aforementioned spec.

The editor code only contains small adjustments to allow for switching between the old and new flow using a key in local storage.

If you're done with all these, you pretty much reviewed 90% of the PR. Congratulations!
