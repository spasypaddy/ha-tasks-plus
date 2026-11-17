"""Make this repository's integration visible to the test Home Assistant."""

from pathlib import Path

import custom_components

_OURS = str(Path(__file__).resolve().parent.parent / "custom_components")
if _OURS not in custom_components.__path__:
    custom_components.__path__.insert(0, _OURS)
