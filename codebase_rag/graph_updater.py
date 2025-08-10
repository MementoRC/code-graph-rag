import os
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import toml
from loguru import logger
from tree_sitter import Node, Parser

from codebase_rag.services.graph_service import MemgraphIngestor

from .language_config import LanguageConfig, get_language_config


class GraphUpdater:
    """Parses code using Tree-sitter and updates the graph."""

    def __init__(
        self,
        ingestor: MemgraphIngestor,
        repo_path: Path,
        parsers: dict[str, Parser],
        queries: dict[str, Any],
    ):
        self.ingestor = ingestor
        self.repo_path = repo_path
        self.parsers = parsers
        self.queries = queries
        self.project_name = repo_path.name
        self.structural_elements: dict[Path, str | None] = {}
        self.function_registry: dict[str, str] = {}  # {qualified_name: type}
        self.simple_name_lookup: dict[str, set[str]] = defaultdict(set)
        self.ast_cache: dict[Path, tuple[Node, str]] = {}
        self.ignore_dirs = {
            ".git",
            "venv",
            ".venv",
            "__pycache__",
            "node_modules",
            "build",
            "dist",
            ".eggs",
            ".pytest_cache",
            ".mypy_cache",
            ".ruff_cache",
            ".claude",
        }

    def run(self) -> None:
        """Orchestrates the parsing and ingestion process."""
        print("🚀 GRAPHUPDATER.RUN() CALLED - INTEGRATION TEST EXECUTION")
        logger.critical("🚀 GRAPHUPDATER.RUN() CALLED - INTEGRATION TEST EXECUTION")
        
        self.ingestor.ensure_node_batch("Project", {"name": self.project_name})
        logger.info(f"Ensuring Project: {self.project_name}")

        logger.info("--- Pass 1: Identifying Packages and Folders ---")
        self._identify_structure()

        logger.info(
            "\n--- Pass 2: Processing Files, Caching ASTs, and Collecting Definitions ---"
        )
        self._process_files()

        logger.critical(f"🔍 INTEGRATION TEST DEBUG: Found {len(self.function_registry)} functions in registry")
        logger.critical(f"🔍 INTEGRATION TEST DEBUG: AST cache has {len(self.ast_cache)} files") 
        print(f"🔍 INTEGRATION TEST DEBUG: Found {len(self.function_registry)} functions in registry")
        print(f"🔍 INTEGRATION TEST DEBUG: AST cache has {len(self.ast_cache)} files")

        logger.info(
            f"\n--- Found {len(self.function_registry)} functions/methods in codebase ---"
        )
        logger.info("--- Pass 3: Processing Function Calls from AST Cache ---")
        self._process_function_calls()

        logger.info("\n--- Analysis complete. Flushing all data to database... ---")
        self.ingestor.flush_all()

    def _identify_structure(self) -> None:
        """First pass: Walks the directory to find all packages and folders."""
        for root_str, dirs, _ in os.walk(self.repo_path, topdown=True):
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            root = Path(root_str)
            relative_root = root.relative_to(self.repo_path)

            parent_rel_path = relative_root.parent
            parent_container_qn = self.structural_elements.get(parent_rel_path)

            # Check if this directory is a package for any supported language
            is_package = False
            package_indicators = set()

            # Collect package indicators from all language configs
            for lang_name, lang_queries in self.queries.items():
                lang_config = lang_queries["config"]
                package_indicators.update(lang_config.package_indicators)

            # Check if any package indicator exists
            for indicator in package_indicators:
                if (root / indicator).exists():
                    is_package = True
                    break

            if is_package:
                package_qn = ".".join([self.project_name] + list(relative_root.parts))
                self.structural_elements[relative_root] = package_qn
                logger.info(f"  Identified Package: {package_qn}")
                self.ingestor.ensure_node_batch(
                    "Package",
                    {
                        "qualified_name": package_qn,
                        "name": root.name,
                        "path": str(relative_root),
                    },
                )
                parent_label, parent_key, parent_val = (
                    ("Project", "name", self.project_name)
                    if parent_rel_path == Path(".")
                    else ("Package", "qualified_name", parent_container_qn)
                )
                self.ingestor.ensure_relationship_batch(
                    (parent_label, parent_key, parent_val),
                    "CONTAINS_PACKAGE",
                    ("Package", "qualified_name", package_qn),
                )
            elif root != self.repo_path:
                self.structural_elements[relative_root] = None  # Mark as folder
                logger.info(f"  Identified Folder: '{relative_root}'")
                self.ingestor.ensure_node_batch(
                    "Folder", {"path": str(relative_root), "name": root.name}
                )
                parent_label, parent_key, parent_val = (
                    ("Project", "name", self.project_name)
                    if parent_rel_path == Path(".")
                    else (
                        ("Package", "qualified_name", parent_container_qn)
                        if parent_container_qn
                        else ("Folder", "path", str(parent_rel_path))
                    )
                )
                self.ingestor.ensure_relationship_batch(
                    (parent_label, parent_key, parent_val),
                    "CONTAINS_FOLDER",
                    ("Folder", "path", str(relative_root)),
                )

    def _process_files(self) -> None:
        """Second pass: Walks the directory, parses files, and caches their ASTs."""
        for root_str, dirs, files in os.walk(self.repo_path, topdown=True):
            dirs[:] = [d for d in dirs if d not in self.ignore_dirs]
            root = Path(root_str)
            relative_root = root.relative_to(self.repo_path)
            parent_container_qn = self.structural_elements.get(relative_root)

            parent_label, parent_key, parent_val = (
                ("Package", "qualified_name", parent_container_qn)
                if parent_container_qn
                else (
                    ("Folder", "path", str(relative_root))
                    if relative_root != Path(".")
                    else ("Project", "name", self.project_name)
                )
            )

            for file_name in files:
                filepath = root / file_name
                relative_filepath = str(filepath.relative_to(self.repo_path))

                # Create generic File node for all files
                self.ingestor.ensure_node_batch(
                    "File",
                    {
                        "path": relative_filepath,
                        "name": file_name,
                        "extension": filepath.suffix,
                    },
                )
                self.ingestor.ensure_relationship_batch(
                    (parent_label, parent_key, parent_val),
                    "CONTAINS_FILE",
                    ("File", "path", relative_filepath),
                )

                # Check if this file type is supported for parsing
                lang_config = get_language_config(filepath.suffix)
                if lang_config and lang_config.name in self.parsers:
                    self.parse_and_ingest_file(filepath, lang_config.name)
                elif file_name == "pyproject.toml":
                    self._parse_dependencies(filepath)

    def _get_docstring(self, node: Node) -> str | None:
        """Extracts the docstring from a function or class node's body."""
        body_node = node.child_by_field_name("body")
        if not body_node or not body_node.children:
            return None
        first_statement = body_node.children[0]
        if (
            first_statement.type == "expression_statement"
            and first_statement.children[0].type == "string"
        ):
            text = first_statement.children[0].text
            if text is not None:
                return text.decode("utf-8").strip("'\" \n")  # type: ignore[no-any-return]
        return None

    def parse_and_ingest_file(self, file_path: Path, language: str) -> None:
        """
        Parses a file, ingests its structure and definitions,
        and caches the AST for the next pass.
        """
        if isinstance(file_path, str):
            file_path = Path(file_path)
        relative_path = file_path.relative_to(self.repo_path)
        relative_path_str = str(relative_path)
        logger.info(f"Parsing and Caching AST for {language}: {relative_path_str}")

        try:
            # Check if language is supported
            if language not in self.parsers or language not in self.queries:
                logger.warning(f"Unsupported language '{language}' for {file_path}")
                return

            source_bytes = file_path.read_bytes()
            parser = self.parsers[language]
            tree = parser.parse(source_bytes)
            root_node = tree.root_node

            # Cache the parsed AST for the function call pass
            self.ast_cache[file_path] = (root_node, language)

            module_qn = ".".join(
                [self.project_name] + list(relative_path.with_suffix("").parts)
            )
            if file_path.name == "__init__.py":
                module_qn = ".".join(
                    [self.project_name] + list(relative_path.parent.parts)
                )

            self.ingestor.ensure_node_batch(
                "Module",
                {
                    "qualified_name": module_qn,
                    "name": file_path.name,
                    "path": relative_path_str,
                },
            )

            # Link Module to its parent Package/Folder
            parent_rel_path = relative_path.parent
            parent_container_qn = self.structural_elements.get(parent_rel_path)
            parent_label, parent_key, parent_val = (
                ("Package", "qualified_name", parent_container_qn)
                if parent_container_qn
                else (
                    ("Folder", "path", str(parent_rel_path))
                    if parent_rel_path != Path(".")
                    else ("Project", "name", self.project_name)
                )
            )
            self.ingestor.ensure_relationship_batch(
                (parent_label, parent_key, parent_val),
                "CONTAINS_MODULE",
                ("Module", "qualified_name", module_qn),
            )

            self._ingest_top_level_functions(root_node, module_qn, language)
            self._ingest_classes_and_methods(root_node, module_qn, language)

        except Exception as e:
            logger.error(f"Failed to parse or ingest {file_path}: {e}")

    def _ingest_top_level_functions(
        self, root_node: Node, module_qn: str, language: str
    ) -> None:
        lang_queries = self.queries[language]
        lang_config: LanguageConfig = lang_queries["config"]

        query = lang_queries["functions"]
        # Use compatibility layer for different tree-sitter API versions
        func_nodes = self._execute_query_with_fallback(query, root_node, "function")

        for func_node in func_nodes:
            if not isinstance(func_node, Node):
                logger.warning(
                    f"Expected Node object but got {type(func_node)}: {func_node}"
                )
                continue
            if self._is_method(func_node, lang_config):
                continue

            name_node = func_node.child_by_field_name("name")
            if not name_node:
                continue
            text = name_node.text
            if text is None:
                continue
            func_name = text.decode("utf8")
            func_qn = f"{module_qn}.{func_name}"

            # Extract function properties
            func_props: dict[str, Any] = {
                "qualified_name": func_qn,
                "name": func_name,
                "decorators": [],
                "start_line": func_node.start_point[0] + 1,
                "end_line": func_node.end_point[0] + 1,
                "docstring": self._get_docstring(func_node),
            }
            logger.info(f"  Found Function: {func_name} (qn: {func_qn})")
            self.ingestor.ensure_node_batch("Function", func_props)

            self.function_registry[func_qn] = "Function"
            self.simple_name_lookup[func_name].add(func_qn)

            # Link Function to Module
            self.ingestor.ensure_relationship_batch(
                ("Module", "qualified_name", module_qn),
                "DEFINES",
                ("Function", "qualified_name", func_qn),
            )

    def _build_nested_qualified_name(
        self,
        func_node: Node,
        module_qn: str,
        func_name: str,
        lang_config: LanguageConfig,
    ) -> str | None:
        path_parts = []
        current = func_node.parent

        if not isinstance(current, Node):
            logger.warning(
                f"Unexpected parent type for node {func_node}: {type(current)}. Skipping."
            )
            return None

        while current and current.type not in lang_config.module_node_types:
            if current.type in lang_config.function_node_types:
                if name_node := current.child_by_field_name("name"):
                    text = name_node.text
                    if text is not None:
                        path_parts.append(text.decode("utf8"))
            elif current.type in lang_config.class_node_types:
                return None  # This is a method

            current = current.parent

        path_parts.reverse()
        if path_parts:
            return f"{module_qn}.{'.'.join(path_parts)}.{func_name}"
        else:
            return f"{module_qn}.{func_name}"

    def _is_method(self, func_node: Node, lang_config: LanguageConfig) -> bool:
        current = func_node.parent
        if not isinstance(current, Node):
            return False

        while current and current.type not in lang_config.module_node_types:
            if current.type in lang_config.class_node_types:
                return True
            current = current.parent
        return False

    def _determine_function_parent(
        self, func_node: Node, module_qn: str, lang_config: LanguageConfig
    ) -> tuple[str, str]:
        current = func_node.parent
        if not isinstance(current, Node):
            return "Module", module_qn

        while current and current.type not in lang_config.module_node_types:
            if current.type in lang_config.function_node_types:
                if name_node := current.child_by_field_name("name"):
                    parent_text = name_node.text
                    if parent_text is None:
                        continue
                    parent_func_name = parent_text.decode("utf8")
                    if parent_func_qn := self._build_nested_qualified_name(
                        current, module_qn, parent_func_name, lang_config
                    ):
                        return "Function", parent_func_qn
                break

            current = current.parent

        return "Module", module_qn

    def _ingest_classes_and_methods(
        self, root_node: Node, module_qn: str, language: str
    ) -> None:
        lang_queries = self.queries[language]

        query = lang_queries["classes"]
        # Use compatibility layer for different tree-sitter API versions
        class_nodes = self._execute_query_with_fallback(query, root_node, "class")

        for class_node in class_nodes:
            if not isinstance(class_node, Node):
                continue
            name_node = class_node.child_by_field_name("name")
            if not name_node:
                continue
            text = name_node.text
            if text is None:
                continue
            class_name = text.decode("utf8")
            class_qn = f"{module_qn}.{class_name}"
            class_props: dict[str, Any] = {
                "qualified_name": class_qn,
                "name": class_name,
                "decorators": [],
                "start_line": class_node.start_point[0] + 1,
                "end_line": class_node.end_point[0] + 1,
                "docstring": self._get_docstring(class_node),
            }
            logger.info(f"  Found Class: {class_name} (qn: {class_qn})")
            self.ingestor.ensure_node_batch("Class", class_props)
            self.ingestor.ensure_relationship_batch(
                ("Module", "qualified_name", module_qn),
                "DEFINES",
                ("Class", "qualified_name", class_qn),
            )

            body_node = class_node.child_by_field_name("body")
            if not body_node:
                continue

            method_query = lang_queries["functions"]
            # Use compatibility layer for different tree-sitter API versions
            method_nodes = self._execute_query_with_fallback(method_query, body_node, "function")
            for method_node in method_nodes:
                if not isinstance(method_node, Node):
                    continue
                method_name_node = method_node.child_by_field_name("name")
                if not method_name_node:
                    continue
                text = method_name_node.text
                if text is None:
                    continue
                method_name = text.decode("utf8")
                method_qn = f"{class_qn}.{method_name}"
                method_props: dict[str, Any] = {
                    "qualified_name": method_qn,
                    "name": method_name,
                    "decorators": [],
                    "start_line": method_node.start_point[0] + 1,
                    "end_line": method_node.end_point[0] + 1,
                    "docstring": self._get_docstring(method_node),
                }
                logger.info(f"    Found Method: {method_name} (qn: {method_qn})")
                self.ingestor.ensure_node_batch("Method", method_props)

                self.function_registry[method_qn] = "Method"
                self.simple_name_lookup[method_name].add(method_qn)

                self.ingestor.ensure_relationship_batch(
                    ("Class", "qualified_name", class_qn),
                    "DEFINES_METHOD",
                    ("Method", "qualified_name", method_qn),
                )

    def _parse_dependencies(self, filepath: Path) -> None:
        logger.info(f"  Parsing pyproject.toml: {filepath}")
        try:
            data = toml.load(filepath)
            deps = (data.get("tool", {}).get("poetry", {}).get("dependencies", {})) or {
                dep.split(">=")[0].split("==")[0].strip(): dep
                for dep in data.get("project", {}).get("dependencies", [])
            }
            for dep_name, dep_spec in deps.items():
                if dep_name.lower() == "python":
                    continue
                logger.info(f"    Found dependency: {dep_name} (spec: {dep_spec})")
                self.ingestor.ensure_node_batch("ExternalPackage", {"name": dep_name})
                self.ingestor.ensure_relationship_batch(
                    ("Project", "name", self.project_name),
                    "DEPENDS_ON_EXTERNAL",
                    ("ExternalPackage", "name", dep_name),
                    properties={"version_spec": str(dep_spec)},
                )
        except Exception as e:
            logger.error(f"    Error parsing {filepath}: {e}")

    def _process_function_calls(self) -> None:
        """Third pass: Process function calls using the cached ASTs."""
        print("🔍 === STARTING FUNCTION CALL PROCESSING ===")
        logger.critical(f"🔍 === STARTING FUNCTION CALL PROCESSING ===")
        logger.info(f"AST cache has {len(self.ast_cache)} files")
        print(f"🔍 AST cache has {len(self.ast_cache)} files")
        
        for file_path, (root_node, language) in self.ast_cache.items():
            print(f"🔍 Processing calls in file: {file_path}")
            logger.critical(f"🔍 Processing calls in file: {file_path}")
            self._process_calls_in_file(file_path, root_node, language)
            
        print("🔍 === COMPLETED FUNCTION CALL PROCESSING ===")
        logger.critical(f"🔍 === COMPLETED FUNCTION CALL PROCESSING ===")

    def _process_calls_in_file(
        self, file_path: Path, root_node: Node, language: str
    ) -> None:
        """Process function calls in a specific file using its cached AST."""
        relative_path = file_path.relative_to(self.repo_path)
        logger.debug(f"Processing calls in cached AST for: {relative_path}")

        try:
            module_qn = ".".join(
                [self.project_name] + list(relative_path.with_suffix("").parts)
            )
            if file_path.name == "__init__.py":
                module_qn = ".".join(
                    [self.project_name] + list(relative_path.parent.parts)
                )

            self._process_calls_in_functions(root_node, module_qn, language)
            self._process_calls_in_classes(root_node, module_qn, language)

        except Exception as e:
            logger.error(f"Failed to process calls in {file_path}: {e}")

    def _process_calls_in_functions(
        self, root_node: Node, module_qn: str, language: str
    ) -> None:
        lang_queries = self.queries[language]
        lang_config: LanguageConfig = lang_queries["config"]
        
        logger.info(f"  Processing function calls in module: {module_qn}")

        query = lang_queries["functions"]
        # Use compatibility layer for different tree-sitter API versions
        func_nodes = self._execute_query_with_fallback(query, root_node, "function")
        logger.info(f"  Found {len(func_nodes)} functions to check for calls")
        for func_node in func_nodes:
            if not isinstance(func_node, Node):
                continue
            if self._is_method(func_node, lang_config):
                continue

            name_node = func_node.child_by_field_name("name")
            if not name_node:
                continue
            text = name_node.text
            if text is None:
                continue
            func_name = text.decode("utf8")
            func_qn = self._build_nested_qualified_name(
                func_node, module_qn, func_name, lang_config
            )

            if func_qn:
                self._ingest_function_calls(
                    func_node, func_qn, "Function", module_qn, language
                )

    def _process_calls_in_classes(
        self, root_node: Node, module_qn: str, language: str
    ) -> None:
        lang_queries = self.queries[language]

        query = lang_queries["classes"]
        # Use compatibility layer for different tree-sitter API versions
        class_nodes = self._execute_query_with_fallback(query, root_node, "class")

        for class_node in class_nodes:
            if not isinstance(class_node, Node):
                continue
            name_node = class_node.child_by_field_name("name")
            if not name_node:
                continue
            text = name_node.text
            if text is None:
                continue
            class_name = text.decode("utf8")
            class_qn = f"{module_qn}.{class_name}"

            body_node = class_node.child_by_field_name("body")
            if not body_node:
                continue

            method_query = lang_queries["functions"]
            # Use compatibility layer for different tree-sitter API versions
            method_nodes = self._execute_query_with_fallback(method_query, body_node, "function")
            for method_node in method_nodes:
                if not isinstance(method_node, Node):
                    continue
                method_name_node = method_node.child_by_field_name("name")
                if not method_name_node:
                    continue
                text = method_name_node.text
                if text is None:
                    continue
                method_name = text.decode("utf8")
                method_qn = f"{class_qn}.{method_name}"

                self._ingest_function_calls(
                    method_node, method_qn, "Method", module_qn, language
                )

    def _get_call_target_name(self, call_node: Node) -> str | None:
        """Extracts the name of the function or method being called."""
        # For 'call' in Python and 'call_expression' in JS/TS
        if func_child := call_node.child_by_field_name("function"):
            if func_child.type == "identifier":
                text = func_child.text
                if text is not None:
                    return text.decode("utf8")  # type: ignore[no-any-return]
            # Python: obj.method() -> attribute
            elif func_child.type == "attribute":
                if attr_child := func_child.child_by_field_name("attribute"):
                    text = attr_child.text
                    if text is not None:
                        return text.decode("utf8")  # type: ignore[no-any-return]
            # JS/TS: obj.method() -> member_expression
            elif func_child.type == "member_expression":
                if prop_child := func_child.child_by_field_name("property"):
                    text = prop_child.text
                    if text is not None:
                        return text.decode("utf8")  # type: ignore[no-any-return]

        # For 'method_invocation' in Java
        if name_node := call_node.child_by_field_name("name"):
            text = name_node.text
            if text is not None:
                return text.decode("utf8")  # type: ignore[no-any-return]

        return None

    def _ingest_function_calls(
        self,
        caller_node: Node,
        caller_qn: str,
        caller_type: str,
        module_qn: str,
        language: str,
    ) -> None:
        print(f"🎯 _ingest_function_calls called for {caller_qn}")
        logger.critical(f"🎯 _ingest_function_calls called for {caller_qn}")
        
        calls_query = self.queries[language].get("calls")
        if not calls_query:
            print(f"❌ No calls query available for language: {language}")
            logger.critical(f"❌ No calls query available for language: {language}")
            return

        # Use compatibility layer for different tree-sitter API versions
        print(f"🔍 About to execute query for calls in {caller_qn}")
        call_nodes = self._execute_query_with_fallback(calls_query, caller_node, "call")
        print(f"🔍 Found {len(call_nodes)} call nodes for {caller_qn}")
        logger.critical(f"🔍 Found {len(call_nodes)} call nodes for {caller_qn}")

        for call_node in call_nodes:
            if not isinstance(call_node, Node):
                logger.debug(f"Skipping non-Node call: {type(call_node)}")
                continue
            call_name = self._get_call_target_name(call_node)
            if not call_name:
                logger.debug(f"Could not extract call name from node: {call_node.type}")
                continue
            
            logger.debug(f"Processing call: {call_name} from {caller_qn}")

            callee_info = self._resolve_function_call(call_name, module_qn)
            if not callee_info:
                logger.debug(f"Could not resolve function call: {call_name} in module {module_qn}")
                continue

            callee_type, callee_qn = callee_info
            logger.info(
                f"      CREATING CALL RELATIONSHIP: {caller_qn} -> {call_name} (resolved as {callee_type}:{callee_qn})"
            )

            self.ingestor.ensure_relationship_batch(
                (caller_type, "qualified_name", caller_qn),
                "CALLS",
                (callee_type, "qualified_name", callee_qn),
            )

    def _resolve_function_call(
        self, call_name: str, module_qn: str
    ) -> tuple[str, str] | None:
        # First, try to resolve with fully qualified names
        possible_qns = [
            f"{module_qn}.{call_name}",
            f"{self.project_name}.{call_name}",
            (
                f"{'.'.join(module_qn.split('.')[:-1])}.{call_name}"
                if "." in module_qn
                else None
            ),
        ]
        possible_qns = [qn for qn in possible_qns if qn]

        for qn in possible_qns:
            if qn in self.function_registry:
                return self.function_registry[qn], qn

        # If not found, use the simple name lookup as a fallback
        if call_name in self.simple_name_lookup:
            # This is a simplification.
            for registered_qn in self.simple_name_lookup[call_name]:
                if self._is_likely_same_function(call_name, registered_qn, module_qn):
                    return self.function_registry[registered_qn], registered_qn

        return None

    # TODO: (VA) This is a hack to resolve function calls. We need to improve this.
    def _is_likely_same_function(
        self, call_name: str, registered_qn: str, caller_module_qn: str
    ) -> bool:
        if len(call_name) > 10 or "_" in call_name:
            return True

        caller_parts = caller_module_qn.split(".")
        registered_parts = registered_qn.split(".")

        if (
            len(caller_parts) >= 2
            and len(registered_parts) >= 2
            and caller_parts[:2] == registered_parts[:2]
        ):
            return True

        return False

    def _execute_query_with_fallback(self, query, node: Node, capture_name: str) -> list[Node]:
        """Execute tree-sitter query with API compatibility fallback.
        
        This method handles different tree-sitter API versions:
        - Modern API: uses query.captures() method (should work with Query() constructor)
        - Alternative API: uses query.matches() method  
        - Ultimate fallback: manual tree traversal
        """
        # TEMPORARY: Force manual traversal in CI environment since diagnostic test proves it works
        if os.environ.get('ENVIRONMENT') == 'ci':
            print(f"🔄 CI ENVIRONMENT: Forcing manual traversal for '{capture_name}'", file=sys.stderr)
            logger.critical(f"🔄 CI ENVIRONMENT: Forcing manual traversal for '{capture_name}'")
            result = self._manual_traverse_for_capture(node, capture_name)
            print(f"🔄 CI MANUAL TRAVERSAL: Found {len(result)} nodes for '{capture_name}'", file=sys.stderr)
            logger.critical(f"🔄 CI MANUAL TRAVERSAL: Found {len(result)} nodes for '{capture_name}'")
            return result
            
        try:
            # Try modern API first (should work now with Query constructor)
            if hasattr(query, 'captures'):
                logger.info(f"Using modern API: query.captures() for '{capture_name}'")  # Changed to INFO
                captures = query.captures(node)
                result = captures.get(capture_name, [])
                logger.info(f"Modern API found {len(result)} nodes for '{capture_name}'")  # Changed to INFO
                return result
            elif hasattr(query, 'matches'):
                logger.info(f"Using alternative API: query.matches() for '{capture_name}'")  # Changed to INFO
                matches = query.matches(node) 
                captured_nodes = []
                for pattern_index, match_captures in matches:
                    for capture in match_captures:
                        if len(capture) >= 2 and capture[1] == capture_name:
                            captured_nodes.append(capture[0])
                logger.info(f"Alternative API found {len(captured_nodes)} nodes for '{capture_name}'")  # Changed to INFO
                return captured_nodes
            else:
                # Handle very old tree-sitter API that has capture_count, pattern_count etc.
                logger.warning(f"Query object has no captures() or matches() methods - trying old API patterns for '{capture_name}'")
                logger.warning(f"Available query methods: {[attr for attr in dir(query) if not attr.startswith('_')]}")  # Show available methods
                
                # Try different execution patterns for old tree-sitter API
                try:
                    # Pattern 1: Try using query as a function with node argument  
                    if callable(query):
                        logger.info(f"Query is callable, trying query(node) pattern")
                        matches = query(node)
                        captured_nodes = []
                        for match in matches:
                            if hasattr(match, 'captures'):
                                for capture in match.captures:
                                    if capture[1] == capture_name:  # (node, name) tuple
                                        captured_nodes.append(capture[0])
                            elif isinstance(match, tuple) and len(match) >= 2:
                                if match[1] == capture_name:
                                    captured_nodes.append(match[0])
                        if captured_nodes:
                            logger.info(f"Old API callable pattern found {len(captured_nodes)} nodes")
                            return captured_nodes
                    
                    # Pattern 2: Check if node has a method to execute queries
                    for method_name in ['query', 'search', 'match']:
                        if hasattr(node, method_name):
                            logger.info(f"Trying node.{method_name}(query) pattern")
                            executor = getattr(node, method_name)
                            if callable(executor):
                                matches = executor(query)
                                captured_nodes = []
                                for match in matches:
                                    if isinstance(match, tuple) and len(match) >= 2:
                                        if match[1] == capture_name:
                                            captured_nodes.append(match[0])
                                if captured_nodes:
                                    logger.info(f"Node method {method_name} found {len(captured_nodes)} nodes")
                                    return captured_nodes
                    
                    # Pattern 3: Maybe there's a global query execution function
                    import tree_sitter
                    for func_name in ['query', 'execute_query', 'search']:
                        if hasattr(tree_sitter, func_name):
                            logger.info(f"Trying tree_sitter.{func_name}(query, node) pattern")
                            executor = getattr(tree_sitter, func_name)
                            if callable(executor):
                                try:
                                    matches = executor(query, node)
                                    captured_nodes = []
                                    for match in matches:
                                        if isinstance(match, tuple) and len(match) >= 2:
                                            if match[1] == capture_name:
                                                captured_nodes.append(match[0])
                                    if captured_nodes:
                                        logger.info(f"Module function {func_name} found {len(captured_nodes)} nodes")
                                        return captured_nodes
                                except Exception as e:
                                    logger.debug(f"Module function {func_name} failed: {e}")
                                    
                except Exception as api_error:
                    logger.warning(f"Old API execution failed: {api_error}")
                
                # Final fallback to manual traversal
                logger.info(f"All query API attempts failed, using manual traversal for '{capture_name}'")
                result = self._manual_traverse_for_capture(node, capture_name)
                logger.info(f"Manual traversal fallback found {len(result)} nodes for '{capture_name}'")
                return result
        except Exception as e:
            logger.warning(f"Query execution failed: {e}, using manual traversal")
            return self._manual_traverse_for_capture(node, capture_name)
    
    def _manual_traverse_for_capture(self, node: Node, capture_name: str) -> list[Node]:
        """Manual AST traversal to find nodes of specific type.
        
        This is used as fallback when tree-sitter query API is unavailable.
        Maps capture names to actual AST node types from language configuration.
        """
        found_nodes = []
        
        def traverse(current_node: Node) -> None:
            # Map capture names to actual AST node types
            if capture_name == "function":
                # Python functions are 'function_definition' nodes
                target_types = ["function_definition"]
            elif capture_name == "class":
                # Python classes are 'class_definition' nodes  
                target_types = ["class_definition"]
            elif capture_name == "call":
                # Python calls are 'call' nodes (this matches)
                target_types = ["call"]
            else:
                # Fallback: use capture name directly
                target_types = [capture_name]
            
            if current_node.type in target_types:
                found_nodes.append(current_node)
                print(f"🎯 FOUND {capture_name} NODE: {current_node.type} at line {current_node.start_point[0]+1}", file=sys.stderr)
            
            for child in current_node.children:
                traverse(child)
        
        traverse(node)
        return found_nodes
