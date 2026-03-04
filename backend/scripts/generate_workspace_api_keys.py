"""
Generate API Keys for Existing Workspaces

Run this script after migration to create initial API keys for all workspaces.

Usage:
    cd backend && python scripts/generate_workspace_api_keys.py

Output:
    Creates API keys and prints them to console (SAVE THESE!)
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.app.core.mongodb import mongodb_manager
from backend.app.services.api_key_service import api_key_service


async def generate_keys_for_all_workspaces():
    """Generate admin API keys for all existing workspaces."""
    db = mongodb_manager.get_async_database()
    
    print("=" * 70)
    print("API Key Generation for Existing Workspaces")
    print("=" * 70)
    print("\n⚠️  IMPORTANT: Save these API keys - they will not be shown again!\n")
    
    workspaces = await db.workspaces.find({}).to_list(None)
    
    if not workspaces:
        print("No workspaces found.")
        return
    
    generated_keys = []
    
    for workspace in workspaces:
        workspace_id = workspace["id"]
        workspace_name = workspace.get("name", "Unnamed")
        
        # Check if keys already exist
        existing = await db.api_keys.find_one({
            "workspace_id": workspace_id,
            "is_active": True
        })
        
        if existing:
            print(f"[{workspace_name}] Already has API keys, skipping")
            continue
        
        try:
            # Create admin key
            key_response = await api_key_service.create_key(
                workspace_id=workspace_id,
                permissions=["read", "write", "delete", "admin"],
                description=f"Admin key generated on {datetime.utcnow().isoformat()}"
            )
            
            generated_keys.append({
                "workspace_id": workspace_id,
                "workspace_name": workspace_name,
                "key_id": key_response.id,
                "api_key": key_response.api_key,
                "key_prefix": key_response.key_prefix
            })
            
            print(f"\n[{workspace_name}] ({workspace_id})")
            print(f"  Key ID: {key_response.id}")
            print(f"  API Key: {key_response.api_key}")
            print(f"  Prefix: {key_response.key_prefix}")
            print(f"  Permissions: {', '.join(key_response.permissions)}")
            
        except Exception as e:
            print(f"[{workspace_name}] Error: {e}")
    
    # Summary
    print("\n" + "=" * 70)
    print(f"Generated {len(generated_keys)} API keys")
    print("=" * 70)
    
    if generated_keys:
        print("\n📋 Summary (save this!):\n")
        print("| Workspace | Key ID | API Key |")
        print("|-----------|--------|---------|")
        for item in generated_keys:
            print(f"| {item['workspace_name']} | {item['key_id']} | {item['api_key']} |")
        
        # Save to file
        output_file = Path("workspace_api_keys.txt")
        with open(output_file, "w") as f:
            f.write("# Workspace API Keys - Generated {}\n".format(datetime.utcnow().isoformat()))
            f.write("# WARNING: Keep this file secure!\n\n")
            for item in generated_keys:
                f.write(f"[{item['workspace_name']}]\n")
                f.write(f"workspace_id: {item['workspace_id']}\n")
                f.write(f"key_id: {item['key_id']}\n")
                f.write(f"api_key: {item['api_key']}\n")
                f.write(f"prefix: {item['key_prefix']}\n\n")
        
        print(f"\n💾 Keys also saved to: {output_file.absolute()}")
        print("   ⚠️  Delete this file after distributing keys!")


async def generate_key_for_workspace(workspace_id: str):
    """Generate a single API key for a specific workspace."""
    db = mongodb_manager.get_async_database()
    
    # Verify workspace exists
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        print(f"Workspace '{workspace_id}' not found")
        return
    
    workspace_name = workspace.get("name", "Unnamed")
    
    # Create key
    key_response = await api_key_service.create_key(
        workspace_id=workspace_id,
        permissions=["read", "write", "delete", "admin"],
        description=f"Admin key generated on {datetime.utcnow().isoformat()}"
    )
    
    print("=" * 70)
    print(f"API Key for {workspace_name}")
    print("=" * 70)
    print(f"\nWorkspace ID: {workspace_id}")
    print(f"Key ID: {key_response.id}")
    print(f"API Key: {key_response.api_key}")
    print(f"Prefix: {key_response.key_prefix}")
    print(f"Permissions: {', '.join(key_response.permissions)}")
    print("\n" + "=" * 70)
    print("⚠️  SAVE THIS KEY - it will not be shown again!")
    print("=" * 70)


async def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate API keys for workspaces")
    parser.add_argument(
        "--workspace",
        help="Generate key for specific workspace ID (omit for all)"
    )
    
    args = parser.parse_args()
    
    try:
        print("Connecting to MongoDB...")
        await mongodb_manager.connect()
        print("✓ Connected\n")
        
        if args.workspace:
            await generate_key_for_workspace(args.workspace)
        else:
            await generate_keys_for_all_workspaces()
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        await mongodb_manager.close()
    
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
