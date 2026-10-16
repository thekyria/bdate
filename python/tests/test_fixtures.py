import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "gen_fixtures.py"


def _load_generator():
    spec = importlib.util.spec_from_file_location("gen_fixtures", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class FixtureTests(unittest.TestCase):
    def test_shared_fixtures_are_up_to_date(self):
        gen = _load_generator()
        self.assertTrue(gen.OUT.exists(), "run: uv run python scripts/gen_fixtures.py")
        self.assertEqual(
            gen.OUT.read_text(encoding="utf-8"),
            gen.render(),
            "fixtures/cases.json is stale; run: uv run python scripts/gen_fixtures.py",
        )
