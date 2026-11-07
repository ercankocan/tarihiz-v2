# Tarihİz inceleme sürümü

Tek dosyalı HTML önizlemesini indirip tarayıcıda açın. “Çalışmaya Başla” düğmesinden sonra `DEMO-30` kodunu girin. Örnek çalışmalar yalnızca aynı tarayıcıda saklanır. Yeni çalışma başlatınca önceki çalışma korunur. Örnek diyaloglar Gemini bağlantısı kullanmaz. PDF raporu son adımda indirilebilir.

## Kaynak paketi

`platform-v3/` yeni uygulamadır. ZIP içindeki `assets/` dosyaları depodaki mevcut logo ve beş bannerın aynı kopyalarıdır. Depo için önerilen ekleme yalnızca `platform-v3/` klasörüdür. Önizleme için ZIP'i açın, kökten `python -m http.server 8000` çalıştırın ve `http://localhost:8000/platform-v3/` adresini açın.

## Canlı bağlantıları etkinleştirme

1. Öğretmenin belirlediği tek araştırma sorusu için `activity-template.json` dosyasını doldurun. Üç kaynağın özgün belge görüntüsü, tam künyesi ve doğrulanmış metni gerekir. Okunamayan yerleri aktarımda açıkça işaretleyin. `verified` alanını ancak metin doğrulandıktan sonra `true` yapın. Onaylı her etkinlik sürümü farklı bir `id` kullanır. Sunucu etkinlik içeriğini her çalışmayla birlikte saklar.
2. Supabase SQL Editor'da `supabase/schema.sql` dosyasını bir kez çalıştırın. Öğretmen verileri `tarihiz_works` tablosunda `participant_id` ile `tarihiz_participants` kayıtlarını eşleştirerek inceleyebilir. `state.answers` ilk ve son yanıtları, `state.chats` diyalogları, `state.cursor` ve `state.unlocked` ilerlemeyi tutar.
3. `api/.env.example` alanlarını API sunucusunun ortam değişkenlerinde tanımlayın. `CODE_PEPPER` için örneğin `python -c "import secrets; print(secrets.token_urlsafe(48))"` ile benzersiz bir değer oluşturun ve saklayın. `GEMINI_MODEL` alanında kendi hesabınızın yapılandırılmış JSON yanıtını destekleyen modelini seçin. `ACTIVITY_FILE` doldurduğunuz JSON dosyasının mutlak yoludur. `ALLOWED_ORIGINS` yayımlanacak Pages adresinin origin değeridir. Sunucu anahtarları yalnız API ortamındadır.
4. `platform-v3/` içinden `python api/provision_codes.py --count 8 --out private` ile öğretmen için kodları üretin. `private/supabase_katilimcilar.csv` dosyasını Supabase'deki `tarihiz_participants` tablosuna aktarın. `private/ogretmen_kodlari.csv` öğretmene ait ham kod listesidir. Üretici ve sunucu aynı `CODE_PEPPER` değerini kullanır.
5. Ayrı bir Python ortamında `python -m pip install -r api/requirements.txt` çalıştırın. `platform-v3/` içinden `python -m uvicorn api.app:app --host 0.0.0.0 --port 8000` ile API'yi başlatın. Yayında HTTPS ve güvenilen ters vekil ayarlarını kullanın. `/health` sunucunun başladığını bildirir. Bağlantıları gerçek bir deneme koduyla ayrıca sınayın.
6. Ön yüzde `config.js` içindeki `preview` değerini `false`, `apiBase` değerini HTTPS API adresi olarak ayarlayın. GitHub Pages statik yayınına HTML, CSS, ön yüz JS dosyaları, kullanılan vendor dosyaları ve mevcut `assets/` yeterlidir. Kimlik bilgilerini veya öğrenci çalışmalarını Pages'e koymayın.

## Öğrenci akışı

Ana sayfa, katılım kodu, çalışma seçimi, tek kaynak bölümünün altı aşaması, çoklu kaynak bölümünün beş aşaması ve rapor. Künye değerlendirmesi kaydedilmeden belge açılmaz. Her bölümün ilk yanıtı gönderildikten sonra korunur. Çoklu kaynak alanında üç belge arasında geçiş yapılır. Gerçek sorgulamada Gemini bir sonraki soruyu önceki yanıta göre üretir. Sabit tur sayısı uygulanmaz. Etkinlik raporunda ilk ve son değerlendirmeler, diyaloglar, kaynak künyeleri ve nihai sonuç yer alır.

## Kontrol

`platform-v3/` içinden `PYTHONPATH=. python -m unittest discover -s tests -v` ile sunucu kural testlerini çalıştırabilirsiniz. Canlı Supabase ve Gemini bağlantıları öğretmenin hizmetleri ve kaynaklarıyla kurulmalıdır. Önizlemede kullanılan kurmaca metinler sınıf uygulaması için hazırlanmış tarihsel belgeler değildir.
