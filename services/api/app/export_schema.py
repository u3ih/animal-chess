"""Write the public GraphQL SDL to packages/social-protocol/schema.graphql.

Run: ``python -m app.export_schema``. This is the shared contract the web client codegens from.
"""

import sys
from pathlib import Path

from app.graphql.schema import schema


def main() -> None:
    default = Path(__file__).resolve().parents[3] / "packages" / "social-protocol" / "schema.graphql"
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(schema.as_str() + "\n", encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
