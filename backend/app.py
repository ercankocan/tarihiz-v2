from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Tarihİz V2 API")


class ResearchRequest(BaseModel):
    claim: str


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Tarihİz V2 backend çalışıyor."
    }


@app.post("/research")
def research(request: ResearchRequest):
    return {
        "status": "ok",
        "claim": request.claim,
        "message": "Tarihî iddia başarıyla alındı."
    }