import os
import sys
import logging
import platform
from pathlib import Path
from typing import cast
from unittest.mock import MagicMock, call

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from codebase_rag.graph_updater import GraphUpdater
from codebase_rag.services.graph_service import MemgraphIngestor


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
    temp_project: Path, mock_ingestor: MemgraphIngestor
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
        print("Files in temp project:")
        for file_path in temp_project.rglob("*"):
            if file_path.is_file():
                print(f"  {file_path.relative_to(temp_project)}")
                
    from codebase_rag.parser_loader import load_parsers

    # === DEBUGGING: Parser Loading ===
    print("\n=== PARSER LOADING DIAGNOSTICS ===")
    try:
        parsers, queries = load_parsers()
        print(f"Successfully loaded parsers: {len(parsers) if parsers else 0}")
        print(f"Successfully loaded queries: {len(queries) if queries else 0}")
        
        if parsers:
            print("Available parser languages:")
            for lang, parser in parsers.items():
                print(f"  {lang}: {type(parser).__name__}")
        else:
            print("WARNING: No parsers loaded!")
            
        if queries:
            print("Available query languages:")
            for lang, query_set in queries.items():
                print(f"  {lang}: {len(query_set) if query_set else 0} queries")
        else:
            print("WARNING: No queries loaded!")
            
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
    mock_ingestor.reset_mock()
    print("Mock ingestor reset completed")

    # === DEBUGGING: GraphUpdater Creation ===
    print("\n=== GRAPH UPDATER SETUP ===")
    updater = GraphUpdater(
        ingestor=mock_ingestor,
        repo_path=temp_project,
        parsers=parsers,
        queries=queries,
    )
    print(f"GraphUpdater created successfully")
    print(f"GraphUpdater repo_path: {updater.repo_path}")
    print(f"GraphUpdater has parsers: {hasattr(updater, 'parsers') and updater.parsers is not None}")
    print(f"GraphUpdater has queries: {hasattr(updater, 'queries') and updater.queries is not None}")
    
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
    all_calls = mock_ingestor.method_calls
    print(f"Total mock method calls: {len(all_calls)}")
    
    # Analyze ensure_relationship_batch calls specifically
    relationship_calls = mock_ingestor.ensure_relationship_batch.call_args_list
    print(f"ensure_relationship_batch calls: {len(relationship_calls)}")
    
    print("All ensure_relationship_batch calls:")
    for i, call_obj in enumerate(relationship_calls):
        print(f"  Call {i + 1}: {call_obj}")
        if hasattr(call_obj, 'args') and len(call_obj.args) >= 2:
            print(f"    Relationship type: {call_obj.args[1]}")
    
    # Analyze other mock method calls
    other_method_calls = [call for call in all_calls if 'ensure_relationship_batch' not in str(call)]
    print(f"Other method calls: {len(other_method_calls)}")
    for i, call_obj in enumerate(other_method_calls[:10]):  # Show first 10
        print(f"  Other call {i + 1}: {call_obj}")

    project_name = temp_project.name
    main_func_qn = f"{project_name}.main.main_func"
    util_func_qn = f"{project_name}.utils.util_func"
    local_func_qn = f"{project_name}.main.local_func"

    print(f"\n=== EXPECTED RELATIONSHIP ANALYSIS ===")
    print(f"Project name: {project_name}")
    print(f"Expected main_func qualified name: {main_func_qn}")
    print(f"Expected util_func qualified name: {util_func_qn}")
    print(f"Expected local_func qualified name: {local_func_qn}")

    expected_calls = [
        call(
            ("Function", "qualified_name", main_func_qn),
            "CALLS",
            ("Function", "qualified_name", util_func_qn),
        ),
        call(
            ("Function", "qualified_name", main_func_qn),
            "CALLS",
            ("Function", "qualified_name", local_func_qn),
        ),
    ]
    
    print("Expected calls:")
    for i, expected_call in enumerate(expected_calls):
        print(f"  Expected call {i + 1}: {expected_call}")

    actual_calls = [
        c
        for c in cast(MagicMock, mock_ingestor.ensure_relationship_batch).call_args_list
        if c.args[1] == "CALLS"
    ]
    
    print(f"\n=== ACTUAL CALLS RELATIONSHIP FILTERING ===")
    print(f"Filtered CALLS relationships: {len(actual_calls)}")
    print("Actual CALLS calls:")
    for i, actual_call in enumerate(actual_calls):
        print(f"  Actual call {i + 1}: {actual_call}")
    
    # === DEBUGGING: Assertion Analysis ===
    print(f"\n=== ASSERTION ANALYSIS ===")
    print(f"Expected calls count: {len(expected_calls)}")
    print(f"Actual CALLS count: {len(actual_calls)}")
    
    if len(actual_calls) != len(expected_calls):
        print("MISMATCH DETECTED!")
        print("This will cause assertion failure")
        
        # Check if expected calls exist in actual calls
        for i, expected_call in enumerate(expected_calls):
            is_present = expected_call in actual_calls
            print(f"  Expected call {i + 1} present: {is_present}")
            if not is_present:
                print(f"    Missing: {expected_call}")
    else:
        print("Call counts match - checking individual calls...")
        for i, expected_call in enumerate(expected_calls):
            is_present = expected_call in actual_calls
            print(f"  Expected call {i + 1} present: {is_present}")

    print("=== END DEBUGGING OUTPUT ===\n")

    assert len(actual_calls) == len(expected_calls)
    assert expected_calls[0] in actual_calls
    assert expected_calls[1] in actual_calls
