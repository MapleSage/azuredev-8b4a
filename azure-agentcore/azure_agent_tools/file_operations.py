"""File operations - equivalent to strands_tools/file_read.py and file_write.py"""
import os
from pathlib import Path

def read_file(file_path: str) -> dict:
    """Read file contents safely"""
    try:
        path = Path(file_path).expanduser()
        if not path.exists():
            return {"error": f"File not found: {file_path}"}
        
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "path": str(path),
            "content": content,
            "size": len(content),
            "lines": len(content.splitlines())
        }
    except Exception as e:
        return {"error": f"Failed to read file: {e}"}

def write_file(file_path: str, content: str, mode: str = "w") -> dict:
    """Write content to file safely"""
    try:
        path = Path(file_path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, mode, encoding='utf-8') as f:
            f.write(content)
        
        return {
            "path": str(path),
            "size": len(content),
            "mode": mode,
            "success": True
        }
    except Exception as e:
        return {"error": f"Failed to write file: {e}"}