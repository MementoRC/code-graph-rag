import os
import platform
import sys
from pathlib import Path
from typing import cast
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
    with open(project_path / "utils.py", "w") as f:
        f.write("def util_func():\n    pass\n")
    with open(project_path / "main.py", "w") as f:
        f.write("from utils import util_func\n\n")
        f.write("def main_func():\n")
        f.write("    util_func()\n")
        f.write("    local_func()\n\n")
        f.write("def local_func():\n    pass\n")
    return project_path


def test_function_call_relationships_are_created(
    temp_project: Path,
    mock_ingestor: MagicMock,
) -> None:
    """
    Tests that GraphUpdater correctly identifies and creates CALLS relationships.
    """
    # === DEBUGGING: Environment Information ===
    print("\n=== ENVIRONMENT DIAGNOSTICS ===", file=sys.stderr)
    print(f"Platform: {platform.platform()}", file=sys.stderr)
    print(f"Python version: {sys.version}", file=sys.stderr)
    print(f"Working directory: {os.getcwd()}", file=sys.stderr)
    print(f"Python path entries: {len(sys.path)}", file=sys.stderr)
    print(f"Temp project path: {temp_project}", file=sys.stderr)
    print(f"Temp project exists: {temp_project.exists()}", file=sys.stderr)

    # List files in temp project
    if temp_project.exists():
        print("\n=== PROJECT FILES ===", file=sys.stderr)
        for file_path in temp_project.rglob("*"):
            if file_path.is_file():
                print(f"  {file_path.relative_to(temp_project)}", file=sys.stderr)
                if file_path.suffix == ".py":
                    print("    Content:", file=sys.stderr)
                    content = file_path.read_text()
                    for i, line in enumerate(content.splitlines(), 1):
                        print(f"    {i:2}: {line}", file=sys.stderr)

    # Create pyproject.toml for the temp project
    pyproject_content = """
[tool.codebase-rag]
include = ["*.py"]
exclude = ["__pycache__", "*.pyc", "tests/"]
"""
    pyproject_path = temp_project / "pyproject.toml"
    with open(pyproject_path, "w") as f:
        f.write(pyproject_content.strip())

    print(f"Created pyproject.toml: {pyproject_path}", file=sys.stderr)

    # === DEBUGGING: Parser and Query Loading ===
    print("\n=== PARSER AND QUERY LOADING ===", file=sys.stderr)
    try:
        from codebase_rag.parser_loader import load_parsers

        parsers, queries = load_parsers()
        print(f"Parsers loaded: {list(parsers.keys())}", file=sys.stderr)
        print(f"Queries loaded: {list(queries.keys())}", file=sys.stderr)

        # Show query details for debugging
        for ext, ext_queries in queries.items():
            print(f"  {ext}: {list(ext_queries.keys())}", file=sys.stderr)

    except Exception as e:
        print(f"ERROR loading parsers: {e}")
        import traceback

        traceback.print_exc()
        raise

    # === DEBUGGING: Mock Setup Verification ===
    print("\n=== MOCK SETUP VERIFICATION ===")
    print(f"Mock ingestor type: {type(mock_ingestor)}")
    print(f"Mock ingestor methods: {dir(mock_ingestor)}")

    # Reset mock to ensure clean state
    cast(MagicMock, mock_ingestor).reset_mock()
    print("Mock ingestor reset completed")

    # === DEBUGGING: GraphUpdater Creation ===
    print("\n=== GRAPH UPDATER SETUP ===")
    updater = GraphUpdater(
        ingestor=mock_ingestor,
        repo_path=temp_project,
        parsers=parsers,
        queries=queries,
    )
    print("GraphUpdater created successfully")
    print(f"GraphUpdater repo_path: {updater.repo_path}")
    print(
        f"GraphUpdater has parsers: {hasattr(updater, 'parsers') and updater.parsers is not None}",
    )
    print(
        f"GraphUpdater has queries: {hasattr(updater, 'queries') and updater.queries is not None}",
    )

    # === DEBUGGING: Run Execution ===
    print("\n=== RUNNING GRAPH UPDATER ===")
    try:
        updater.run()
        print("GraphUpdater.run() completed successfully")
    except Exception as e:
        print(f"ERROR during GraphUpdater.run(): {e}")
        import traceback

        traceback.print_exc()
        raise

    # === DEBUGGING: Mock Call Analysis ===
    print("\n=== MOCK CALL ANALYSIS ===")
    all_calls = cast(MagicMock, mock_ingestor).method_calls
    print(f"Total mock method calls: {len(all_calls)}")

    # Analyze ensure_relationship_batch calls specifically
    relationship_calls = cast(MagicMock, mock_ingestor).ensure_relationship_batch.call_args_list
    print(f"ensure_relationship_batch calls: {len(relationship_calls)}")

    print("All ensure_relationship_batch calls:")
    for i, call_obj in enumerate(relationship_calls):
        print(f"  Call {i + 1}: {call_obj}")
        if hasattr(call_obj, "args") and len(call_obj.args) >= 2:
            print(f"    Relationship type: {call_obj.args[1]}")

    # Analyze other mock method calls
    node_calls = cast(MagicMock, mock_ingestor).ensure_node_batch.call_args_list
    print(f"ensure_node_batch calls: {len(node_calls)}")

    # === DEBUGGING: Detailed Mock Call Analysis ===
    print("\n=== DETAILED MOCK ANALYSIS ===")
    for i, method_call in enumerate(all_calls):
        print(f"Call {i + 1}: {method_call}")

    # === ASSERTIONS ===
    print("\n=== RUNNING ASSERTIONS ===")

    # Check that the ingestor methods were called
    cast(MagicMock, mock_ingestor).ensure_node_batch.assert_called()
    cast(MagicMock, mock_ingestor).ensure_relationship_batch.assert_called()

    print("✅ Basic method call assertions passed")

    # Check for function call relationships being created
    relationship_calls = cast(MagicMock, mock_ingestor).ensure_relationship_batch.call_args_list

    # Find CALLS relationships
    calls_relationships = []
    for call_args in relationship_calls:
        # call_args is a Call object with args and kwargs
        if hasattr(call_args, 'args') and len(call_args.args) >= 1:
            batch_data = call_args.args[0]  # First argument is the batch
            for relationship in batch_data:
                # relationship is a tuple: ((from_id, to_id), rel_type, (from_id, to_id), rel_data)
                if len(relationship) >= 2 and relationship[1] == "CALLS":
                    calls_relationships.append(relationship)

    print(f"Found {len(calls_relationships)} CALLS relationships")
    for i, rel in enumerate(calls_relationships):
        print(f"  CALLS {i + 1}: {rel}")

    # Assert that CALLS relationships were created
    assert len(calls_relationships) > 0, (
        f"Expected at least 1 CALLS relationship, but found {len(calls_relationships)}. "
        f"All relationship calls: {relationship_calls}"
    )

    print(f"✅ Found {len(calls_relationships)} CALLS relationships as expected")

    # Optional: More specific assertions about the relationships
    # This would check that specific function calls like util_func() and local_func() are detected
    call_targets = [rel[0][1] for rel in calls_relationships]  # Extract target IDs
    print(f"Call targets found: {call_targets}")

    print("✅ All assertions passed!")
