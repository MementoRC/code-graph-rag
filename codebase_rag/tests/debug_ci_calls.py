"""
Debug test to identify why calls are not detected in CI environment.

This diagnostic test directly examines the tree-sitter parsing and 
calls query execution to isolate the CI failure point.

Usage:
    python codebase_rag/tests/debug_ci_calls.py
    pixi run python codebase_rag/tests/debug_ci_calls.py
    pixi run -e ci-integration python codebase_rag/tests/debug_ci_calls.py
"""

import os
import sys
import tempfile
from pathlib import Path
from typing import Any

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from tree_sitter import Language, Parser, Node


def print_diagnostic(title: str, content: Any = None) -> None:
    """Print diagnostic information with clear formatting."""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print('='*60)
    if content is not None:
        print(content)


def test_debug_calls_detection():
    """Debug why calls are not detected in CI environment."""
    
    all_tests_passed = True
    
    # Step 1: Environment diagnostics
    print_diagnostic("ENVIRONMENT")
    print(f"Platform: {sys.platform}")
    print(f"Python version: {sys.version}")
    print(f"Working directory: {os.getcwd()}")
    
    # Step 2: Test tree-sitter Python import
    print_diagnostic("TREE-SITTER PYTHON IMPORT")
    try:
        from tree_sitter_python import language as python_language
        print("✅ Successfully imported tree_sitter_python")
        print(f"Language function type: {type(python_language)}")
    except ImportError as e:
        print(f"❌ Failed to import tree_sitter_python: {e}")
        return
    
    # Step 3: Create parser and language
    print_diagnostic("PARSER SETUP")
    try:
        language = Language(python_language())
        parser = Parser(language)
        print("✅ Parser created successfully")
    except Exception as e:
        print(f"❌ Failed to create parser: {e}")
        return
    
    # Step 4: Test code that should have calls
    test_code = """from utils import util_func

def main_func():
    util_func()
    local_func()

def local_func():
    pass
"""
    
    print_diagnostic("TEST CODE")
    print(test_code)
    
    # Step 5: Parse the code
    print_diagnostic("PARSING")
    try:
        tree = parser.parse(bytes(test_code, "utf8"))
        root_node = tree.root_node
        print(f"✅ Parsed successfully, root node type: {root_node.type}")
        print(f"Root node has {root_node.child_count} children")
    except Exception as e:
        print(f"❌ Failed to parse: {e}")
        return
    
    # Step 6: Create and test the calls query
    print_diagnostic("CALLS QUERY")
    try:
        calls_query_string = "(call) @call"
        calls_query = language.query(calls_query_string)
        print(f"✅ Query created: {calls_query_string}")
    except Exception as e:
        print(f"❌ Failed to create query: {e}")
        return
    
    # Step 7: Execute query and find calls
    print_diagnostic("QUERY EXECUTION")
    try:
        captures = calls_query.captures(root_node)
        print(f"Query returned {len(captures)} captures")
        print(f"Captures dict keys: {list(captures.keys())}")
        
        call_nodes = captures.get("call", [])
        print(f"Found {len(call_nodes)} call nodes")
        
        if call_nodes:
            print("\n📞 DETECTED CALLS:")
            for i, call_node in enumerate(call_nodes, 1):
                print(f"\nCall {i}:")
                print(f"  Type: {call_node.type}")
                print(f"  Text: {call_node.text.decode('utf8') if call_node.text else 'None'}")
                
                # Try to extract function name
                func_child = call_node.child_by_field_name("function")
                if func_child:
                    print(f"  Function child type: {func_child.type}")
                    if func_child.type == "identifier":
                        func_name = func_child.text.decode("utf8") if func_child.text else None
                        print(f"  Function name: {func_name}")
        else:
            print("❌ No calls detected!")
            
    except Exception as e:
        print(f"❌ Failed to execute query: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # Step 8: Manual tree traversal to find call nodes
    print_diagnostic("MANUAL TREE TRAVERSAL")
    
    def find_calls_manually(node: Node, depth: int = 0) -> list[Node]:
        """Recursively find all call nodes."""
        calls = []
        if node.type == "call":
            calls.append(node)
        
        for child in node.children:
            calls.extend(find_calls_manually(child, depth + 1))
        
        return calls
    
    manual_calls = find_calls_manually(root_node)
    print(f"Manual traversal found {len(manual_calls)} call nodes")
    
    if manual_calls:
        print("\n📞 MANUALLY FOUND CALLS:")
        for i, call_node in enumerate(manual_calls, 1):
            print(f"\nCall {i}:")
            print(f"  Text: {call_node.text.decode('utf8') if call_node.text else 'None'}")
    
    # Step 9: Test with temporary file (simulating CI environment)
    print_diagnostic("TEMPORARY FILE TEST")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_path = Path(tmpdir) / "test_module.py"
        temp_path.write_text(test_code)
        print(f"Created temp file: {temp_path}")
        print(f"File exists: {temp_path.exists()}")
        
        # Re-parse from file
        file_content = temp_path.read_bytes()
        tree = parser.parse(file_content)
        root_node = tree.root_node
        
        captures = calls_query.captures(root_node)
        temp_calls = captures.get("call", [])
        print(f"Calls found from temp file: {len(temp_calls)}")
    
    # Step 10: Summary
    print_diagnostic("SUMMARY")
    print(f"✅ Parser works: Yes")
    print(f"✅ Query compiles: Yes")
    print(f"{'✅' if call_nodes else '❌'} Query finds calls: {'Yes' if call_nodes else 'No'}")
    print(f"{'✅' if manual_calls else '❌'} Manual traversal finds calls: {'Yes' if manual_calls else 'No'}")
    print(f"Expected calls: util_func(), local_func()")
    print(f"Actual calls found: {len(call_nodes)}")
    
    # Return success if we found the expected 2 calls
    if len(call_nodes) != 2:
        print(f"\n❌ TEST FAILED: Expected 2 calls, found {len(call_nodes)}")
        all_tests_passed = False
    else:
        print("\n✅ TEST PASSED: All calls detected correctly")
    
    return all_tests_passed


if __name__ == "__main__":
    success = test_debug_calls_detection()
    sys.exit(0 if success else 1)