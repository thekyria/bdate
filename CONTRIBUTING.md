# Contributing

Thanks for your interest in bdate.

## Reporting a bug

Open an [issue](https://github.com/thekyria/bdate/issues/new/choose). There
are two forms: **Wrong date or hour** if bdate reckoned something you believe
is wrong (please give the date, time zone and place, and a source for what
you expected), and **Something else is broken** for crashes, install problems
or the clock misbehaving. For security issues, see [SECURITY.md](SECURITY.md)
instead.

## Sending a change

1. Fork the repository and branch off `main`.
2. Set up the hooks once: `pre-commit install` (they scan for secrets and
   reject binary files).
3. Make the change. Python is the source of truth: if you change the
   reckoning, change `python/` first, regenerate the fixtures
   (`cd python && uv run python scripts/gen_fixtures.py`) and bring the JS
   port in `js/` in line.
4. Run the checks for what you touched (see [Quick start](README.md#quick-start)):
   `cd python && uv run pytest && uv run ruff check . && uv run ruff format --check .`,
   `cd js && npm test`, `node --test tests/api/*.test.mjs`.
5. Open a pull request against `main`. CI must pass before it is merged.

By contributing you agree that your contribution is licensed under the
project's [MIT license](LICENSE).
