"""Code interpreter - equivalent to strands_tools/code_interpreter"""
import subprocess
import tempfile
import os
from pathlib import Path

def execute_code(code: str, language: str = "python") -> dict:
    """Execute code safely in isolated environment"""
    try:
        if language.lower() == "python":
            return _execute_python(code)
        elif language.lower() in ["bash", "shell"]:
            return _execute_bash(code)
        else:
            return {"error": f"Unsupported language: {language}"}
    except Exception as e:
        return {"error": f"Code execution failed: {e}"}

def _execute_python(code: str) -> dict:
    """Execute Python code"""
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
            f.write(code)
            temp_file = f.name
        
        result = subprocess.run(
            ['python3', temp_file],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        os.unlink(temp_file)
        
        return {
            "language": "python",
            "code": code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
            "success": result.returncode == 0
        }
    except subprocess.TimeoutExpired:
        return {"error": "Code execution timed out"}
    except Exception as e:
        return {"error": f"Python execution failed: {e}"}

def _execute_bash(code: str) -> dict:
    """Execute bash commands"""
    try:
        result = subprocess.run(
            code,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        return {
            "language": "bash",
            "code": code,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
            "success": result.returncode == 0
        }
    except subprocess.TimeoutExpired:
        return {"error": "Command execution timed out"}
    except Exception as e:
        return {"error": f"Bash execution failed: {e}"}