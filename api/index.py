import sys
import os

# Add the repository root to the sys.path so that 'backend.app' is discoverable as a package
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

# Import the FastAPI application from the backend directory
from backend.app.main import app

# Note: In Vercel's Serverless environment, background task workers (lifespan)
# might be interrupted if they run after the response is sent.
