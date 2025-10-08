from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="SageInsure Claims Agent")

class ClaimRequest(BaseModel):
    claim_id: str = None
    action: str
    details: str = None

@app.get("/")
def health():
    return {"status": "SageInsure Claims Agent", "version": "1.0"}

@app.post("/process")
def process_claim(request: ClaimRequest):
    if request.action == "create":
        claim_id = f"CLM-{hash(request.details) % 10000:04d}"
        return {"claim_id": claim_id, "status": "created", "message": "Claim created successfully"}
    elif request.action == "update":
        return {"claim_id": request.claim_id, "status": "updated", "message": "Claim updated"}
    elif request.action == "settle":
        return {"claim_id": request.claim_id, "status": "settled", "amount": "$5,000"}
    return {"error": "Invalid action"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
