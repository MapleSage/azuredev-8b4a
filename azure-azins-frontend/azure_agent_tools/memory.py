"""Memory tools - equivalent to strands_tools/memory.py and agent_core_memory.py"""
import json
import os
from datetime import datetime
from pathlib import Path

MEMORY_FILE = Path.home() / ".azure_agent_memory.json"

def store_memory(key: str, value: str, category: str = "general") -> dict:
    """Store information in agent memory"""
    try:
        memory = _load_memory()
        
        memory[key] = {
            "value": value,
            "category": category,
            "timestamp": datetime.now().isoformat(),
            "updated": datetime.now().isoformat()
        }
        
        _save_memory(memory)
        
        return {
            "key": key,
            "stored": True,
            "category": category,
            "timestamp": memory[key]["timestamp"]
        }
    except Exception as e:
        return {"error": f"Failed to store memory: {e}"}

def retrieve_memory(key: str = None, category: str = None) -> dict:
    """Retrieve information from agent memory"""
    try:
        memory = _load_memory()
        
        if key:
            if key in memory:
                return {
                    "key": key,
                    "found": True,
                    **memory[key]
                }
            else:
                return {"key": key, "found": False}
        
        # Filter by category if specified
        if category:
            filtered = {k: v for k, v in memory.items() if v.get("category") == category}
            return {"category": category, "items": filtered, "count": len(filtered)}
        
        # Return all memory
        return {"items": memory, "count": len(memory)}
    except Exception as e:
        return {"error": f"Failed to retrieve memory: {e}"}

def _load_memory() -> dict:
    """Load memory from file"""
    if MEMORY_FILE.exists():
        with open(MEMORY_FILE, 'r') as f:
            return json.load(f)
    return {}

def _save_memory(memory: dict):
    """Save memory to file"""
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(MEMORY_FILE, 'w') as f:
        json.dump(memory, f, indent=2)