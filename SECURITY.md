# Security

## Secrets

Keys and tokens live in environment variables or an untracked `.env`, never in the repository. `.env` is git-ignored;
commit an `.env.example` with the names and no values. If a secret is ever committed, treat it as leaked: revoke it, then
remove it from the history.

## What this project reaches

- The engine reads and writes files in the repository you point it at, and runs `git ls-files` there (read-only). It opens no
  network connection. With `gh` installed and logged in, `init` and `badges` run `gh repo view` to learn whether a repository is public.
- The generated hooks are shell scripts that run in your repository: read them before you trust them, like any hook.
- A skill runs with your agent's permissions. Install it from a source you trust, and review what an update changes.
- The site makes no request except for the fonts it loads from Google Fonts.

## Reporting a vulnerability

Open a private security advisory on the repository (Security tab, "Report a vulnerability"), or contact the maintainer
directly. Please do not open a public issue for a vulnerability. Expect an answer within a few days.

## Supported versions

The latest release receives fixes.
