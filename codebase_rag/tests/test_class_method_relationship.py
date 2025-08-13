import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from codebase_rag.graph_updater import GraphUpdater


@pytest.fixture
def temp_project(temp_repo: Path) -> Path:
    """Set up a temporary directory with a sample Python project."""
    project_path = temp_repo / "test_project"
    os.makedirs(project_path)
    (project_path / "__init__.py").touch()
    with open(project_path / "main.py", "w") as f:
        f.write("class MyClass:\n")
        f.write("    def my_method(self):\n")
        f.write("        pass\n")

    # Create pyproject.toml for the temp project
    pyproject_content = """
[tool.codebase-rag]
include = ["*.py"]
exclude = ["__pycache__", "*.pyc", "tests/"]
"""
    pyproject_path = project_path / "pyproject.toml"
    with open(pyproject_path, "w") as f:
        f.write(pyproject_content.strip())

    return project_path


def test_defines_method_relationship_is_created(
    temp_project: Path,
    mock_ingestor: MagicMock,
) -> None:
    """
    Tests that GraphUpdater correctly identifies and creates DEFINES_METHOD relationships.
    """
    from codebase_rag.parser_loader import load_parsers

    parsers, queries = load_parsers()

    updater = GraphUpdater(
        ingestor=mock_ingestor,
        repo_path=temp_project,
        parsers=parsers,
        queries=queries,
    )
    updater.run()

    # Based on GraphUpdater format: {file_stem}::{class_name}
    class_qn = "main::MyClass"
    method_qn = "main::MyClass.my_method"

    expected_relationship = (
        ("Class", "qualified_name", class_qn),
        "DEFINES_METHOD",
        ("Method", "qualified_name", method_qn),
        {"file_path": "main.py"},
    )

    # Extract DEFINES_METHOD relationships from batch calls
    actual_defines_method_relationships = []
    all_calls = mock_ingestor.ensure_relationship_batch.call_args_list

    for call_obj in all_calls:
        if hasattr(call_obj, "args") and len(call_obj.args) > 0:
            # First argument is the list of relationships
            relationships = call_obj.args[0]
            if isinstance(relationships, list):
                for rel in relationships:
                    if len(rel) >= 2 and rel[1] == "DEFINES_METHOD":
                        actual_defines_method_relationships.append(rel)

    # Verify we found exactly one DEFINES_METHOD relationship
    assert len(actual_defines_method_relationships) == 1

    # Verify the relationship matches what we expect
    actual_relationship = actual_defines_method_relationships[0]
    assert actual_relationship == expected_relationship
