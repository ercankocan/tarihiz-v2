# Tarihİz · Konu Başlıkları

Öğrenci aynı katılım koduyla giriş yapar, konu başlığını seçer ve kaynağı inceler. İlk yanıt gönderildikten sonra kilitlenir. Gemini soruları ve öğrenci yanıtları ayrı zaman damgalarıyla tutulur. Bir soruyu yanıtladıktan sonra öğrenci son değerlendirmeye geçebilir. Tamamlanmış bir konu yalnızca okunabilir. Yazı alanları kısa bir duraklamadan sonra taslak olarak kaydedilir.

## Ayrı test ortamında kurulum

1. Boş bir test Supabase projesinde SQL Editor ile `supabase/schema.sql` çalıştırın. Önceki şemayı içeren bir test projesinde **yalnız** `supabase/migrations/001_topics.sql` kullanın. Yeni tablolar `tarihiz_topics` ve `tarihiz_topic_works`. Eski çalışmalar kendi tablosunda kalır.
2. Test ortamında istenirse `supabase/demo.sql` ile iki açıkça etiketlenmiş kurmaca konu ekleyin. Gerçek içerikler için Table Editor’da `tarihiz_topics` içine başlık, ana soru, `sources` JSON dizisi ve `demo` değeri girin. Kimlik otomatik üretilir. Her kaynakta benzersiz bir `id`, başlık, kısa künye, HTTPS görsel adresi veya kısa belge metni bulunur. Yalnız görsel kullanıldığında öğretmenin doğruladığı bir `description` girin. Gemini görsel içeriğini bu açıklamadan alır. Doğrulanmış aktarım `text` alanına yazılır. Var olan çalışmalar, oluşturuldukları andaki soru ve kaynakları kullanır. Aynı öğrenciye yeni etkinlik atamak için yeni konu satırı ekleyin.
3. Test projesinin Edge Secrets alanında `GEMINI_API_KEY`, `GEMINI_MODEL`, `CODE_PEPPER` ve arayüzün origin değerini içeren `ALLOWED_ORIGINS` ayarlayın. Oturum ve kod doğrulama için mevcut pepper korunmalıdır. Test öğrencileri için `api/provision_codes.py` betiği kullanılabilir. Veritabanı erişimi yalnızca Edge Function'ın service role anahtarıyla yapılır.
4. Test projesinde `supabase/functions/tarihiz-api/index.ts` dosyasını `tarihiz-api` olarak kurun. Bu işlev kendi anonim oturumunu doğruladığı için **yalnız bu işlevde** ağ geçidinin legacy JWT doğrulamasını kapatın. `config.js` içindeki `apiBase` değerini test işlevinin tam HTTPS adresine ayarlayın. Yerel varsayılan yerel Supabase'e yönelir. Depo kökünden statik sunucu çalıştırıp `/platform-v3/` sayfasını açın. Bu dal dağıtım yapmaz.
5. Pilot öncesinde gerçek belgeleri ve künyelerini, katılım kodlarını, model erişimini ve mobil görünümü test projesinde deneyin. İki kod ve iki konu ile kayıt yalıtımını, sohbeti, yenileme sonrası devam etmeyi ve tamamlanan yanıtlardaki kilidi kontrol edin.

## Araştırma kayıtları

`participant_id` öğrencinin tüm konularını birleştirir. `topic_id` aynı konuya ikinci çalışma açılmasını engelleyen bileşik anahtarın diğer parçasıdır. `activity_snapshot` özgün başlık, soru, kaynak kimlikleri ve kullanılan içerikleri saklar. `state` içinde aşama, taslak, zamanlı ilk ve son yanıtlar, sıralı konuşma ve bitirme zamanı bulunur. `created_at` ve `updated_at` çalışma kaydına aittir.

## Test

`platform-v3/` içinde `node --test tests/*.test.cjs` çalıştırın (Node 20+). HTTP testleri gerçek Edge giriş noktasını çağırır. Veritabanı ve Gemini ağ sınırları bellek içi benzetimlerdir. Python dosyaları ve önceki testleri eski API için korunur.
