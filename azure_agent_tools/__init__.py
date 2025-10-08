"""Azure Agent Core Tools - Equivalent to Strands Tools"""

from .current_time import get_current_time
from .calculator import calculate
from .http_request import make_http_request
from .file_operations import read_file, write_file
from .browser import browse_web
from .code_interpreter import execute_code
from .memory import store_memory, retrieve_memory

__all__ = [
    'get_current_time', 'calculate', 'make_http_request',
    'read_file', 'write_file', 'browse_web', 'execute_code',
    'store_memory', 'retrieve_memory'
]