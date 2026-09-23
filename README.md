# Neon + Vercel Preview Deploy

A GitHub Action that creates (or reconciles) a Neon preview branch and deploys it to
Vercel with the branch's full environment injected — including services Neon's own
[Vercel integrations](https://neon.com/docs/guides/vercel) don't inject yet, like Object
Storage credentials.

## Why

Neon's Vercel-Managed and Neon-Managed integrations inject `DATABASE_URL` (and Neon Auth
vars, when enabled) into preview deployments automatically. They don't inject anything
for other `neon.ts`-declared services yet — Object Storage, for one. This action replaces
that integration with one you control: it runs `neon checkout` (which already knows how
to read every service your `neon.ts` declares) and passes everything it writes straight
into the `vercel deploy` call for that same build.

## Usage

```yaml
name: Preview
on:
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: neon-solutions/neon-vercel-preview-action@v1
        id: preview
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        with:
          neon-api-key: ${{ secrets.NEON_API_KEY }}
          neon-project-id: ${{ vars.NEON_PROJECT_ID }}
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` are required so `vercel pull --yes` can resolve the
project non-interactively without a committed `.vercel/project.json` — find them by running
`vercel link` once locally and reading `.vercel/project.json`.

Disable Vercel's native Git integration auto-deploy so this action's deploy is the only
one that runs (otherwise every push produces two deployments):

```json
// vercel.json
{ "git": { "deploymentEnabled": false } }
```

## `neon.ts` is optional

If the working directory has a `neon.ts`, `neon checkout --create` provisions everything
it declares on the new branch (Postgres, Object Storage buckets, Neon Auth, …) and writes
all of it to `.env.local`. If there's no `neon.ts`, `checkout` still creates a bare branch
and writes just `DATABASE_URL` / `DATABASE_URL_UNPOOLED` / `NEON_BRANCH`. Either way, this
action reads whatever ended up in that file — it never has to know what your `neon.ts`
declares.

## Overriding or adding variables

Every variable Neon writes is available to both the build (as real process env for
`vercel build`) and the deployed runtime (as `-e` flags on `vercel deploy --prebuilt`).
Use `extra-env` to override any of them, or add ones Neon doesn't set at all — Neon's
values are applied first, so a key you supply here always wins:

```yaml
      - uses: neon-solutions/neon-vercel-preview-action@v1
        with:
          neon-api-key: ${{ secrets.NEON_API_KEY }}
          neon-project-id: ${{ vars.NEON_PROJECT_ID }}
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          extra-env: |
            DATABASE_URL=${{ secrets.OVERRIDE_DATABASE_URL }}
            FEATURE_FLAG_X=true
```

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `neon-api-key` | Yes | — | Neon API key |
| `neon-project-id` | Yes | — | Neon project ID |
| `vercel-token` | Yes | — | Vercel API token |
| `neon-branch-name` | No | `preview/<git ref>` | Neon branch to create/checkout |
| `vercel-environment` | No | `preview` | Vercel environment to pull/build/deploy against |
| `extra-env` | No | `''` | `KEY=VALUE` lines, one per line. Overrides/adds to Neon's env |
| `working-directory` | No | `.` | Directory containing `neon.ts` (if any) and the app to deploy |

## Outputs

| Output | Description |
|---|---|
| `neon-branch-name` | The Neon branch that was created or reconciled |
| `deployment-url` | The URL of the resulting Vercel deployment |

## What it does, in order

1. Installs the `neon` and `vercel` CLIs.
2. `neon checkout <branch> --create --update-existing` — creates the branch from
   `neon.ts` if it doesn't exist yet (evaluating `!branch.exists`-gated policy, so TTL/
   compute/services take effect at creation), or reconciles it if this PR already has one
   from an earlier push. Writes `.env.local`.
3. Reads `.env.local`, merges `extra-env` on top.
4. `vercel pull`, then `vercel build` with the merged env as real process env (build-time
   values have to be present *during* the build, not passed to `deploy` afterward), then
   `vercel deploy --prebuilt` with the merged env as `-e` runtime flags.

`vercel-environment: production` passes `--prod` to `build`/`deploy`; any value other than
`preview`/`production` passes `--target=<value>` for a named custom environment.

## Known limitations

- `neon-branch-name`'s default doesn't sanitize the git ref — an unusual branch name
  (slashes beyond the `preview/` prefix, uppercase, special characters) may need an
  explicit `neon-branch-name` input instead of the default.
- Only ever creates/reconciles one branch; deleting it when the PR closes isn't this
  action's job — pair it with [`delete-branch-action`](https://github.com/neondatabase/delete-branch-action)
  in your `pull_request.closed` handler if you want that.
- Checkout never passes `--allow-protected`, so if `neon-branch-name` resolves to a branch
  Neon has marked protected, the action fails rather than reconciling it.
- The `neon` and `vercel` CLIs are installed at `@latest` on every run — not pinned, so a
  breaking CLI release could break this action without a version bump here.
- No live `vercel deploy` has been run against a real Vercel project as part of verifying
  this action; the CLI invocations follow Vercel's documented CI pattern but the full
  integration (env actually reaching a real build and a real deployed function) is
  untested end-to-end.

## License

MIT
