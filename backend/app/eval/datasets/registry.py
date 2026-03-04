"""
Dataset registry for managing available RAG evaluation datasets.

Provides a centralized registry for all supported datasets with
easy access to loaders for both English and Vietnamese datasets.
"""

from typing import Any, Callable, Dict, List, Optional, Type

import structlog

from backend.app.eval.datasets.base import BaseDatasetLoader, DatasetInfo

logger = structlog.get_logger(__name__)


class DatasetRegistry:
    """
    Central registry for all evaluation datasets.
    
    Manages dataset loaders and provides easy access to available datasets.
    Supports lazy loading of dataset loaders to avoid unnecessary imports.
    
    Example:
        # Register a dataset
        registry.register("ms_marco", MSMarcoLoader)
        
        # Get a dataset loader
        loader = registry.get("ms_marco")
        
        # List all available datasets
        datasets = registry.list_datasets()
    """
    
    def __init__(self):
        self._loaders: Dict[str, Type[BaseDatasetLoader]] = {}
        self._infos: Dict[str, DatasetInfo] = {}
        self._loader_instances: Dict[str, BaseDatasetLoader] = {}
        self.logger = logger
    
    def register(
        self, 
        name: str, 
        loader_class: Type[BaseDatasetLoader],
        info: Optional[DatasetInfo] = None
    ) -> None:
        """
        Register a dataset loader.
        
        Args:
            name: Unique name for the dataset
            loader_class: Class that inherits from BaseDatasetLoader
            info: Optional dataset metadata
        """
        if name in self._loaders:
            self.logger.warning("dataset_already_registered", name=name)
            return
        
        self._loaders[name] = loader_class
        if info:
            self._infos[name] = info
        self.logger.info("dataset_registered", name=name)
    
    def get(self, name: str, **kwargs) -> BaseDatasetLoader:
        """
        Get a dataset loader instance.
        
        Args:
            name: Name of the registered dataset
            **kwargs: Arguments to pass to the loader constructor
            
        Returns:
            Instance of the dataset loader
            
        Raises:
            KeyError: If dataset is not registered
        """
        if name not in self._loaders:
            raise KeyError(f"Dataset '{name}' not registered. Available: {list(self._loaders.keys())}")
        
        # Return cached instance if no custom kwargs
        cache_key = f"{name}_{hash(str(sorted(kwargs.items())))}"
        if cache_key in self._loader_instances:
            return self._loader_instances[cache_key]
        
        # Create new instance
        loader_class = self._loaders[name]
        instance = loader_class(**kwargs)
        self._loader_instances[cache_key] = instance
        
        return instance
    
    def list_datasets(self, language: Optional[str] = None) -> List[str]:
        """
        List all registered datasets.
        
        Args:
            language: Filter by language ("en", "vi", "multilingual")
            
        Returns:
            List of dataset names
        """
        datasets = list(self._loaders.keys())
        
        if language:
            filtered = []
            for name in datasets:
                info = self._infos.get(name)
                if info and info.language == language:
                    filtered.append(name)
            return filtered
        
        return datasets
    
    def get_info(self, name: str) -> Optional[DatasetInfo]:
        """
        Get metadata for a dataset.
        
        Args:
            name: Dataset name
            
        Returns:
            DatasetInfo if available, None otherwise
        """
        if name in self._infos:
            return self._infos[name]
        
        # Try to get from loader instance
        try:
            loader = self.get(name)
            return loader.info()
        except Exception:
            return None
    
    def is_registered(self, name: str) -> bool:
        """Check if a dataset is registered."""
        return name in self._loaders
    
    def unregister(self, name: str) -> None:
        """Unregister a dataset."""
        self._loaders.pop(name, None)
        self._infos.pop(name, None)
        # Clear cached instances
        keys_to_remove = [k for k in self._loader_instances if k.startswith(f"{name}_")]
        for key in keys_to_remove:
            del self._loader_instances[key]
    
    def get_by_domain(self, domain: str) -> List[str]:
        """
        Get datasets by domain.
        
        Args:
            domain: Domain name (e.g., "medical", "finance")
            
        Returns:
            List of dataset names
        """
        result = []
        for name, info in self._infos.items():
            if domain in info.domains:
                result.append(name)
        return result


# Global registry instance
dataset_registry = DatasetRegistry()


# Convenience functions for registration
def register_dataset(
    name: str,
    loader_class: Type[BaseDatasetLoader],
    info: Optional[DatasetInfo] = None
) -> Callable:
    """Decorator to register a dataset loader."""
    dataset_registry.register(name, loader_class, info)
    return loader_class