# conftest.py — pytest automatically imports this file before collecting any
# tests. By living in Backend/ (the project root for the API), it puts THIS
# folder on Python's import path, so tests can do `from main import app`,
# `import auth`, `import database`, etc.
#
# Why it's needed: when you run a bare `pytest`, pytest adds the *test file's*
# folder (tests/) to sys.path — not Backend/ — so those imports fail with
# "ModuleNotFoundError: No module named 'main'". This file fixes that, so plain
# `pytest` works the same as `python -m pytest` (which adds the current folder).
import os
import sys

# Insert Backend/ (the directory this file lives in) at the front of the import
# path. Front (index 0) so it wins over any same-named module elsewhere.
sys.path.insert(0, os.path.dirname(__file__))
