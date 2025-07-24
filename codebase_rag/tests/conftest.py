import os
import shutil
import sys
import tempfile
from collections.abc import Generator
from pathlib import Path
from unittest.mock import MagicMock

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import dependencies that might not be available (e.g., when mgclient is not installed)
try:
    from codebase_rag.graph_updater import GraphUpdater
    from codebase_rag.parser_loader import load_parsers
    from codebase_rag.services.graph_service import MemgraphIngestor
    HAS_GRAPH_DEPENDENCIES = True
except ImportError:
    # When mgclient or other graph dependencies are not available
    GraphUpdater = None  # type: ignore[misc,assignment]
    MemgraphIngestor = None  # type: ignore[misc,assignment]
    load_parsers = None  # type: ignore[assignment]
    HAS_GRAPH_DEPENDENCIES = False


@pytest.fixture
def temp_repo() -> Generator[Path, None, None]:
    """Creates a temporary repository path for a test and cleans up afterward."""
    temp_dir = tempfile.mkdtemp()
    yield Path(temp_dir)
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_ingestor() -> MagicMock:
    """Provides a mocked MemgraphIngestor instance."""
    if not HAS_GRAPH_DEPENDENCIES:
        pytest.skip("Graph dependencies (mgclient) not available")
    return MagicMock(spec=MemgraphIngestor)


@pytest.fixture
def mock_updater(temp_repo: Path, mock_ingestor: MagicMock) -> MagicMock:
    """Provides a mocked GraphUpdater instance with necessary dependencies."""
    if not HAS_GRAPH_DEPENDENCIES:
        pytest.skip("Graph dependencies (mgclient) not available")
    parsers, queries = load_parsers()
    mock = MagicMock(spec=GraphUpdater)
    mock.repo_path = temp_repo
    mock.ingestor = mock_ingestor
    mock.parsers = parsers
    mock.queries = queries
    return mock
