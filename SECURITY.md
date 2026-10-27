# Security Policy

bdate is a small, dependency-free library (Python and JavaScript), a
command-line tool, a static site with a small web API, and an Android app
that shows the site. There are no user accounts and no stored user data: the
clock app computes everything in the browser, and the place you pick (or your
location, if you share it) stays in that browser's local storage.

## Supported versions

There are no tagged releases yet. Fixes go to the `main` branch, which is
what bdate.app is deployed from.

## Reporting a vulnerability

If you believe you've found a security issue anyway, for example a way to
make the clock page run someone else's script, please report it privately
rather than in a public issue: open a
[private security advisory](https://github.com/thekyria/bdate/security/advisories/new)
(**Report a vulnerability** on the repository's
[Security tab](https://github.com/thekyria/bdate/security)), or contact the
maintainer directly.

## Security measures

- Secret scanning with [gitleaks](https://github.com/gitleaks/gitleaks), as a
  pre-commit hook and in CI over the full history.
- No binary files in the repository besides the clock's icons and the Gradle
  wrapper jar, which CI checks against Gradle's published checksums.
- Dependabot keeps the GitHub Actions and the dev and Android dependencies
  up to date.
