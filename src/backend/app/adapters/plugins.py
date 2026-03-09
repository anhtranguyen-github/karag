"""Central plugin mapping for adapters.

When adding a new adapter (vector store or storage provider), add a single
entry here mapping the provider key to the import path of the implementing
class. Example:

STORAGE_PROVIDERS = {
    "minio": "app.adapters.storage.MinIOStorageProvider",
}

This keeps registration in one place so adding a plugin requires editing
only this file (and the adapter class file itself).
"""

STORAGE_PROVIDERS: dict[str, str] = {
    "minio": "app.adapters.storage.MinIOStorageProvider",
    "s3": "app.adapters.storage.S3StorageProvider",
    "gcs": "app.adapters.storage.GoogleCloudStorageProvider",
    "azure-document-storage": "app.adapters.storage.AzureDocumentStorageProvider",
}

VECTOR_STORES: dict[str, str] = {
    "qdrant": "app.adapters.vector_store.QdrantVectorStore",
    "pinecone": "app.adapters.vector_store.PineconeVectorStore",
    "weaviate": "app.adapters.vector_store.WeaviateVectorStore",
    "milvus": "app.adapters.vector_store.MilvusVectorStore",
}
