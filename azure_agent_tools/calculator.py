"""Calculator tool - equivalent to strands_tools/calculator.py"""
import math
import operator
import re
from typing import Union

def calculate(expression: str) -> dict:
    """Safe calculator for mathematical expressions"""
    try:
        # Replace common math functions
        expression = expression.replace("^", "**")
        expression = re.sub(r'\bpi\b', str(math.pi), expression)
        expression = re.sub(r'\be\b', str(math.e), expression)
        
        # Safe evaluation with limited scope
        allowed_names = {
            "abs": abs, "round": round, "min": min, "max": max,
            "sin": math.sin, "cos": math.cos, "tan": math.tan,
            "sqrt": math.sqrt, "log": math.log, "exp": math.exp,
            "pi": math.pi, "e": math.e
        }
        
        # Compile and evaluate safely
        code = compile(expression, "<string>", "eval")
        result = eval(code, {"__builtins__": {}}, allowed_names)
        
        return {
            "expression": expression,
            "result": result,
            "formatted": f"{result:,.6f}".rstrip('0').rstrip('.') if isinstance(result, float) else str(result)
        }
    except Exception as e:
        return {"error": f"Calculation error: {e}", "expression": expression}