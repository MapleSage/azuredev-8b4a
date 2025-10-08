"""Current time tool - equivalent to strands_tools/current_time.py"""
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def get_current_time(timezone_name: str = None) -> dict:
    """Get current time in specified timezone"""
    default_timezone = os.getenv("DEFAULT_TIMEZONE", "UTC")
    timezone_name = timezone_name or default_timezone
    
    try:
        if timezone_name.upper() == "UTC":
            tz = timezone.utc
        else:
            tz = ZoneInfo(timezone_name)
        
        now = datetime.now(tz)
        return {
            "iso_format": now.isoformat(),
            "formatted": now.strftime("%A, %B %d, %Y at %I:%M %p %Z"),
            "date": now.strftime("%Y-%m-%d"),
            "time": now.strftime("%H:%M:%S"),
            "timezone": timezone_name
        }
    except Exception as e:
        return {"error": f"Invalid timezone: {e}"}