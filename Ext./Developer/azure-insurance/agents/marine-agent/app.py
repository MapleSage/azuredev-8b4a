from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SageInsure Marine Agent")

class MarineRequest(BaseModel):
    vessel_type: str
    coverage_type: str
    query: str

@app.get("/")
def health():
    return {"status": "SageInsure Marine Insurance Agent", "version": "1.0"}

@app.post("/quote")
def get_marine_quote(request: MarineRequest):
    base_premium = {"yacht": 2000, "cargo": 1500, "commercial": 3000}.get(request.vessel_type, 1000)
    return {
        "vessel_type": request.vessel_type,
        "coverage": request.coverage_type,
        "premium": f"${base_premium}",
        "coverage_details": "Hull, machinery, and liability coverage included"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
