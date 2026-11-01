from fastapi import FastAPI
from pydantic import BaseModel
from google import genai

app = FastAPI(title="Tarihİz V2 API")

client = genai.Client()


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

    prompt = f"""
Sen Tarihİz adlı tarih araştırma sisteminin test aşamasındasın.

Kullanıcının girdiği tarihî iddia:
"{request.claim}"

Bu aşamada iddianın doğru veya yanlış olduğuna karar verme.
Sadece iddiayı araştırılabilir, açık ve tarafsız bir tarih araştırması
sorusuna dönüştür.

Sadece dönüştürülmüş soruyu yaz.
"""

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt
    )

    return {
        "status": "ok",
        "claim": request.claim,
        "research_question": response.text
    }