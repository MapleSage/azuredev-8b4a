"""Browser tool - equivalent to strands_tools/browser"""
import requests
from bs4 import BeautifulSoup
import markdownify

def browse_web(url: str, convert_to_markdown: bool = True) -> dict:
    """Browse web pages and extract content"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract title
        title = soup.find('title')
        title_text = title.get_text().strip() if title else "No title"
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        
        # Convert to markdown if requested
        if convert_to_markdown:
            content = markdownify.markdownify(str(soup), heading_style="ATX")
        else:
            content = text
        
        return {
            "url": url,
            "title": title_text,
            "content": content[:2000] + "..." if len(content) > 2000 else content,
            "status_code": response.status_code,
            "success": True
        }
    except Exception as e:
        return {"error": f"Failed to browse {url}: {e}"}