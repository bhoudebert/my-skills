# Protect main on GitHub

**Use this when** you have pushed the generated files and want the rules to be binding, not just advised. `init` only writes files:
these settings are yours to change, and this page gives the commands.

## What depends on your plan

Check before you promise anything to a team. As far as the current GitHub plans say (check them again; they change):

| Feature | Public repository | Private repository |
| --- | --- | --- |
| Branch protection, required checks | free | needs a paid plan (Pro for a personal account, Team for an organisation) |
| CodeQL code scanning | free | needs GitHub Code Security (paid, sold to organisations) |
| Dependabot, Actions, release-please | free | free |

On a private repository on a free personal plan, the checks still run and report, but nothing blocks a merge.

## 1. Run CI once

A required check can only be chosen after it has reported once. Open a pull request, let the workflows finish, then continue.

## 2. Branch protection

Require these checks on the default branch:

- `Quality gate`: the job that waits for every component (the only CI check you need to require)
- `conventional-title`: the pull request title check
- with spec-driven: `Specs validate` and `Spec or docs with code`

```bash
gh api -X PUT repos/OWNER/REPO/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": { "strict": true, "contexts": ["Quality gate", "conventional-title"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Replace `OWNER/REPO`. "Include administrators" (`enforce_admins`) decides whether you are bound too: on for a team, your choice for a solo project.

## 3. Merge settings

Squash merging only, with the pull request title as the commit title, since the title is what release-please reads:

```bash
gh api -X PATCH repos/OWNER/REPO -f allow_squash_merge=true -f allow_merge_commit=false -f allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY -f delete_branch_on_merge=true
```

## 4. Labels and secrets

- With spec-driven: `gh label create no-spec --description "No behaviour change: no spec update needed" --color d4c5f9`
- With release-please: a secret `RELEASE_PLEASE_TOKEN` (a personal access token or GitHub App token with `contents` and
  `pull-requests` write). Without it the release pull request is opened by the workflow's own token, which starts no other workflow, so
  the required checks never run on it. Never paste a token into a chat or a file in the repository.

## 5. Security features

Settings, Code security: turn on Dependabot alerts and security updates, secret scanning and push protection. Use the generated
`codeql.yml` and **do not also enable "default setup"**: the two conflict. On a private repository without Code Security, remove
`codeql.yml` (or answer `codeql: false`).

The same commands, with every option explained, are in [`github-settings.md`](../../skills/project-foundation/references/github-settings.md).

<!-- docs-nav:start -->
---
**Documentation:** [Start here](../start-here.md) · [Guides](./new-project.md) · [Concepts](../concepts.md) · [Reference](../cli.md) · [Glossary](../glossary.md) · [All pages](../README.md)

← [How your agents will behave](./working-with-agents.md) · [Concepts](../concepts.md) →
<!-- docs-nav:end -->
