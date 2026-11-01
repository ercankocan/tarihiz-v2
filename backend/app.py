from fastapi import FastAPI

app = FastAPI(title="Tarihİz V2 API")


@app.get("/")
def root():
    return {
        "status": "ok",
        "message": "Tarihİz V2 backend çalışıyor."
    }