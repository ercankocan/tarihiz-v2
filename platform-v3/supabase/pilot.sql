-- Existing schema required. Re-running preserves curated image metadata.
begin;
alter table public.tarihiz_topics add column if not exists pilot boolean not null default false;
insert into public.tarihiz_topics(id,title,question,sources,demo,pilot)
select id,title,question,sources,demo,pilot from jsonb_to_recordset($topics$
[
  {
    "id": "20270000-0000-4000-8000-000000000001",
    "title": "Altın Elbiseli Adam",
    "question": "Altın Elbiseli Adam'a ait buluntulardan hareketle, bu kişinin yaşadığı toplum hakkında neler söyleyebiliriz?",
    "sources": [
      {
        "id": "altin-elbiseli-adam",
        "title": "Altın Elbiseli Adam",
        "image": "pilot-gorseller/altin-elbiseli-adam/kaynak.jpg",
        "image_ready": true,
        "description": "Altın Elbiseli Adam, Kazakistan'daki Esik Kurganı'nda gerçekleştirilen arkeolojik kazılarda ortaya çıkarılan buluntularla tanınmaktadır. Kazakistan Cumhuriyeti Ulusal Müzesi, bu buluntuları Saka dönemiyle ilişkilendirmektedir.",
        "metadata": {
          "Konu": "Altın Elbiseli Adam",
          "Buluntu yeri": "Esik Kurganı, Kazakistan",
          "İlişkilendirildiği kültür": "Saka",
          "Kaynak kurumu": "Kazakistan Cumhuriyeti Ulusal Müzesi",
          "Sergi": "The Gold Hall No. 1",
          "Görsel türü": "Modern kıyafet rekonstrüksiyonunun fotoğrafı",
          "Rekonstrüksiyon": "Krym Altynbekov",
          "Fotoğraf": "Derzsi Elekes Andor, 13 Kasım 2012",
          "Görsel kaydı": "Wikimedia Commons · File:Sun emperor.JPG",
          "Fotoğraf lisansı": "CC BY-SA 3.0 · https://creativecommons.org/licenses/by-sa/3.0/"
        },
        "reference_url": "https://nmrk.kz/en/structure/exhibition-activities/",
        "image_credit_url": "https://commons.wikimedia.org/wiki/File:Sun_emperor.JPG"
      }
    ],
    "demo": false,
    "pilot": true
  },
  {
    "id": "20270000-0000-4000-8000-000000000002",
    "title": "1914'te Doğu Karadeniz'de Eğitim",
    "question": "1914 tarihli bu haritadan hareketle Doğu Karadeniz'deki çocukların eğitim olanakları hakkında hangi çıkarımlarda bulunabiliriz?",
    "sources": [
      {
        "id": "trabzon-okul-haritasi",
        "title": "Trabzon Vilayeti okul haritası",
        "image": "pilot-gorseller/trabzon-okul-haritasi/kaynak.jpg",
        "image_ready": true,
        "description": "Bu harita, Osmanlı Devleti'nin son döneminde Trabzon Vilayeti'ndeki okulları göstermek amacıyla hazırlanmış ve Eylül 1914'te Matbaa-i Âmire tarafından yayımlanmıştır.",
        "metadata": {
          "Belge": "Trabzon Vilayeti’ndeki okulları gösteren harita, No. 13",
          "Tarih": "Eylül 1330 / Eylül 1914",
          "Yayıncı": "Matbaa-i Âmire",
          "Tür": "Tarihsel harita",
          "Arşiv": "SALT Araştırma",
          "Envanter numarası": "EPL013",
          "Görsel kaynağı": "SALT Araştırma, EPL013, No. 13",
          "Lisans": "CC BY-NC-ND 4.0 · https://creativecommons.org/licenses/by-nc-nd/4.0/"
        },
        "reference_url": "https://archives.saltresearch.org/handle/123456789/99196",
        "legend": [
          "Kırmızı daireler: Arşiv aktarımında “kable’l-inkılâb” (inkılaptan önce) var olan okullar.",
          "Siyah daireler: İnkılaptan sonra Eylül 1914’e kadar kurulan ve açılan okullar.",
          "Çift çizgili daireler: Kız okulları.",
          "Daire içindeki bölmeler: Okulun dershane sayısı.",
          "Dairenin üzerindeki rakam: Kasabada o türden kaç okul bulunduğu.",
          "Üçgenler: Numune mektepleri.",
          "Karma okullar, erkek okulları arasında gösterilmiştir."
        ]
      }
    ],
    "demo": false,
    "pilot": true
  }
]
$topics$::jsonb) as p(id uuid,title text,question text,sources jsonb,demo boolean,pilot boolean)
on conflict(id) do update
set sources=jsonb_set(tarihiz_topics.sources,'{0}',(tarihiz_topics.sources->0) ||
    jsonb_build_object('image',excluded.sources->0->'image','image_ready',true,
      'metadata',(tarihiz_topics.sources->0->'metadata') || (excluded.sources->0->'metadata')) ||
    case when excluded.sources->0 ? 'image_credit_url' then jsonb_build_object('image_credit_url',excluded.sources->0->'image_credit_url') else '{}'::jsonb end)
where tarihiz_topics.pilot and tarihiz_topics.sources->0->>'id'=excluded.sources->0->>'id';
commit;
