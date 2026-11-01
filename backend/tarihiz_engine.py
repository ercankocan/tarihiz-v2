import os
import json
import re
import time
import random
import httpx

from google import genai
from tavily import TavilyClient


# ============================================================
# API BAĞLANTILARI
# ============================================================

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY bulunamadı.")

if not TAVILY_API_KEY:
    raise RuntimeError("TAVILY_API_KEY bulunamadı.")

client = genai.Client(api_key=GEMINI_API_KEY)
tavily = TavilyClient(api_key=TAVILY_API_KEY)


# ============================================================
# OPENALEX ABSTRACT DÖNÜŞTÜRME
# ============================================================

def abstract_olustur(inverted_index):

    if not inverted_index:
        return ""

    kelimeler = []

    for kelime, konumlar in inverted_index.items():
        for konum in konumlar:
            kelimeler.append((konum, kelime))

    kelimeler.sort(key=lambda x: x[0])

    return " ".join(
        kelime for _, kelime in kelimeler
    )


# ============================================================
# OPENALEX ARAMA
# ============================================================

def openalex_akademik_ara(sorgu, sonuc_sayisi=10):

    response = httpx.get(
        "https://api.openalex.org/works",
        params={
            "search": sorgu,
            "per-page": sonuc_sayisi,
        },
        timeout=30.0,
    )

    response.raise_for_status()

    return response.json()


# ============================================================
# TAVILY GÜVENLİ ARAMA
# ============================================================

def tavily_guvenli_ara(**kwargs):

    son_hata = None

    for deneme in range(4):

        try:
            return tavily.search(**kwargs)

        except Exception as e:

            son_hata = e

            if deneme == 3:
                raise

            bekleme = 3 * (deneme + 1)

            print(
                f"Tavily bağlantı hatası. "
                f"{bekleme} saniye sonra tekrar deneniyor..."
            )

            time.sleep(bekleme)

    raise RuntimeError(
        f"Tavily araması başarısız oldu: {son_hata}"
    )
# ============================================================
# GEMINI GÜVENLİ ÇALIŞTIRMA
# ============================================================

def gemini_ile_calistir(prompt):

    modeller = [
        "gemini-3.8-flash",
        "gemini-3.7-flash",
    ]

    son_hata = None

    for model in modeller:

        for deneme in range(3):

            try:

                response = client.models.generate_content(
                    model=model,
                    contents=prompt,
                )

                return response.text

            except Exception as e:

                son_hata = e
                hata = str(e).lower()

                if (
                    "503" in hata
                    or "429" in hata
                    or "high demand" in hata
                    or "service_unavailable" in hata
                ):

                    bekleme = (2 ** deneme) * 3 + random.uniform(0, 2)

                    print(
                        f"Gemini yoğun. "
                        f"{bekleme:.1f} saniye bekleniyor..."
                    )

                    time.sleep(bekleme)

                else:
                    raise

    raise RuntimeError(
        f"Gemini modellerine ulaşılamadı: {son_hata}"
    )


# ============================================================
# JSON AYIKLAMA
# ============================================================

def json_ayikla(metin):

    metin = str(metin).strip()

    metin = re.sub(
        r"^```(?:json)?\s*",
        "",
        metin,
        flags=re.IGNORECASE,
    )

    metin = re.sub(
        r"\s*```$",
        "",
        metin,
    )

    try:
        return json.loads(metin)
    except Exception:
        pass

    ilk = metin.find("{")
    son = metin.rfind("}")

    if ilk != -1 and son != -1:
        return json.loads(
            metin[ilk:son + 1]
        )

    raise ValueError(
        "Gemini çıktısı JSON olarak çözülemedi:\n\n"
        + metin[:1500]
    )


# ============================================================
# ARAMA SORGULARI OLUŞTUR
# ============================================================

def arama_sorgulari_olustur(iddia):

    prompt = f"""
Sen Tarihİz adlı tarih araştırma sisteminin
arama sorgusu hazırlayan modülüsün.

Tarihî iddia:

"{iddia}"

Bu iddiayı araştırmak için iki sorgu üret:

1. web_query:
Genel web araştırması için kısa ve ayırt edici sorgu.

2. academic_query:
OpenAlex akademik literatür araması için,
tercihen İngilizce ve akademik kavramlar içeren sorgu.

Kurallar:

- İddianın doğru olduğunu varsayma.
- İddianın yanlış olduğunu varsayma.
- Destekleyen ve çelişen kanıtların bulunmasına izin ver.
- Gereksiz uzun sorgu üretme.
- Sadece JSON döndür.
- Markdown kullanma.

{{
  "web_query": "...",
  "academic_query": "..."
}}
"""

    cevap = gemini_ile_calistir(prompt)

    return json_ayikla(cevap)
# ============================================================
# İLK WEB + OPENALEX ARAMASI
# ============================================================

def ilk_arama_yap(iddia):

    sorgular = arama_sorgulari_olustur(iddia)

    web_query = sorgular.get("web_query", iddia)
    academic_query = sorgular.get("academic_query", iddia)

    tavily_json = tavily_guvenli_ara(
        query=web_query,
        search_depth="advanced",
        max_results=5,
        include_answer=False,
        include_images=False,
    )

    openalex_json = openalex_akademik_ara(
        academic_query,
        sonuc_sayisi=10,
    )

    return {
        "web_query": web_query,
        "academic_query": academic_query,
        "web_results": tavily_json.get("results", []),
        "academic_results": openalex_json.get("results", []),
    }
# ============================================================
# AKADEMİK SORGUYU İYİLEŞTİR
# ============================================================

def akademik_sorguyu_iyilestir(
    iddia,
    web_results,
    academic_results,
):

    web_ozet = []

    for k in web_results[:5]:
        web_ozet.append({
            "baslik": k.get("title", ""),
            "ozet": (k.get("content") or "")[:800],
        })

    akademik_ozet = []

    for k in academic_results[:6]:

        abstract = abstract_olustur(
            k.get("abstract_inverted_index")
        )

        akademik_ozet.append({
            "baslik": k.get("display_name", ""),
            "ozet": abstract[:500],
        })

    prompt = f"""
Aşağıdaki tarihî iddia için OpenAlex'te
ikinci ve daha isabetli bir akademik arama yapılacaktır.

İddia:

"{iddia}"

İlk web sonuçlarından ipuçları:

{json.dumps(web_ozet, ensure_ascii=False)}

İlk akademik sonuçlar:

{json.dumps(akademik_ozet, ensure_ascii=False)}

İddiayı doğrudan test etmeye yarayabilecek akademik
çalışmaları bulduracak daha iyi bir OpenAlex sorgusu üret.

Kurallar:

- Genel ve belirsiz ifadelerden kaçın.
- Kişi, olay, yer, dönem, arkeolojik alan,
  belge türü veya teknik kavramları gerektiğinde kullan.
- Mümkünse İngilizce yaz.
- Kısa ve ayırt edici bir sorgu üret.
- Sadece JSON döndür.

{{
  "academic_query_refined": "..."
}}
"""

    cevap = gemini_ile_calistir(prompt)

    veri = json_ayikla(cevap)

    return veri.get(
        "academic_query_refined",
        ""
    )