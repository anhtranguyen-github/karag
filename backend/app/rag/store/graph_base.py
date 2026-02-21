from abc import ABC, abstractmethod
from typing import List, Dict, Any

class GraphStore(ABC):
    """
    Abstract interface for Graph Store operations. 
    Defines methods for inserting and querying relationship graphs independent of the underlying implementation.
    """

    @abstractmethod
    async def get_related_entities(self, keywords: List[str], workspace_id: str, limit: int = 30) -> List[Dict[str, Any]]:
        """
        Returns related entities based on a list of keywords.
        Expected output list of dicts: 
        [{"entity": str, "relationship": str, "related_entity": str}]
        """
        pass

    @abstractmethod
    async def upsert_entities(self, entities: List[Dict[str, Any]], workspace_id: str) -> None:
        """
        Inserts or updates entities and their relationships.
        Input entities format: 
        [{"name": "foo", "type": "bar", "relationships": [{"target": "baz", "type": "rel"}]}]
        """
        pass

    @abstractmethod
    async def get_workspace_graph(self, workspace_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Retrieves the general entity relationships for displaying the Knowledge Graph representation of a workspace.
        Expected output list of dicts: 
        [{"name": str, "type": str, "target": str, "rel_type": str}]
        """
        pass

    @abstractmethod
    async def close(self) -> None:
        """Close graph store connection and release resources."""
        pass
