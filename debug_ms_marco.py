import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.karag
    task = await db.tasks.find_one({"metadata.filename": {"$regex": "MS_MARCO"}})
    if task:
        print(f"ID: {task['id']}")
        print(f"Status: {task['status']}")
        print(f"Message: {task['message']}")
        print(f"Metadata: {task['metadata']}")
    else:
        print("Task not found")
        # Try finding in documents
        doc = await db.documents.find_one({"filename": {"$regex": "MS_MARCO"}})
        if doc:
            print(f"Doc found: {doc['filename']}")
            print(f"Status: {doc['status']}")
        else:
            print("Document not found either")

if __name__ == "__main__":
    asyncio.run(main())
