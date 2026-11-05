# Teslime hazırlık incelemesi ve yerelleştirme doğrulaması

**2026-11-05** tarihli önceki teslim incelemesi, `Mini_DPP_Teknik_Odev_ESG_Next.pdf`
dosyasının iki sayfasına ve sağlanan CSV’ye dayanır. Genişletilmiş uygulama kapsamı
[IMPLEMENTATION.md](IMPLEMENTATION.md) içindedir. Aşağıda önceki doğrulama kanıtı ile
bu oturumdaki TR/EN çalışmasının sonuçları ayrı belirtilmiştir.

Önceki incelemede zorunlu özellikler veya bonuslar için açık kusur bulunmamıştır.
Yerelleştirme; React ve HTTP/HTML sunumunu, testleri ve belgeleri günceller. İş
kuralları, API alanları, değiştirilemez geçmiş ve Model/Batch/Revision mimarisi
korunur; veritabanı şeması veya migration eklenmez.

## Önceki incelemenin öncelikli bulguları

| Öncelik | Bulgu ve kanıt | Sonuç |
| --- | --- | --- |
| P2 | Windows’ta sistem `core.autocrlf=true` ayarı temiz klonu CRLF yapmış; `dotnet format` ENDOFLINE hatalarıyla, Prettier 20 dosyada başarısız olmuştur. Örnek CSV hash’i `3A3444007F0F32D04D4C25BF4CDF63E298AC21EB27F971F1A2D350DFBC04E1C9` olmuştur. | `.gitattributes` ile kaynakta LF, CSV’de metin dönüşümünü kapatma ve PDF’de ikili dosya davranışı sağlanmıştır. Yeniden oluşturulan klon iki biçim denetimini geçmiş ve özgün CSV hash’ine dönmüştür; uygulama/girdi dosyalarını düzenlemek gerekmemiştir. |
| P2 | README, REVIEW, IMPLEMENTATION ve COMMITS, uygulamayı commit edilmemiş ve uzak CI’ı çalıştırılmamış olarak anlatmıştır. Herkese açık dal, temiz klon ve GitHub çalışma/iş API’leri bununla çelişmiştir. | Dört belge düzeltilmiş; gerçek başlıklar, SHA, CI bağlantısı ve sonuçlar kaydedilmiştir. Yapay geçmiş oluşturma planı gerçek geçmişle değiştirilmiştir. |
| Sahip kararı | Değerlendirme PDF’si `07c69fd` içinde herkese açıktır. İkinci sayfa örnek CSV’nin eklenmesine açıkça izin verir; PDF’nin herkese açık yeniden dağıtımını açıkça ele almaz. | Önceki öneri: özel başvuru kopyası tutmak ve PDF’nin herkese açık kalması için ESG Next’in görüşünü almak. Bu bir yayın izni kararıdır; kanıtlanmış uygulama kusuru veya hukuki yasak değildir. PDF ve geçmiş korunmuştur. |

Önceki incelemede P0/P1 uygulama kusuru saptanmamış; varsayımsal özellik,
framework değişikliği veya ilgisiz yeniden yapılandırma önerilmemiştir.

## Yayımlanmış Git ve CI kanıtı

Önceki incelemenin başlangıcında yerel HEAD, temiz herkese açık klon ve GitHub `main`
API’si `b5f86b8a022c3f88b189acac3abfd3fa1d8dd966` bildirmiştir. İlk commit’i;
araçlar, etki alanı, kalıcılık, API, testler, ön uç, belgeler ve CI için dokuz
artımlı commit izler. Başlıklar [COMMITS.md](COMMITS.md) içindedir.

[1 numaralı Build and test çalışması](https://github.com/GorkemErtas/mini-dpp-platform/actions/runs/41825678774)
2026-11-04 tarihinde bu SHA’nın `main` dalına gönderilmesiyle başlamış ve ilk denemede
başarılı tamamlanmıştır. Önceki kayda göre Türkiye saatiyle 15:01:19’da başlamış,
15:02:32 itibarıyla bitmiştir; UTC 12:01:19–12:02:32. **backend**, **frontend** ve
**browser** işleri ile zorunlu adımları başarılıdır. Bu iş sonuçları yerelleştirme
oturumunda GitHub aracı üzerinden yeniden doğrulanmıştır.

Sonraki belge/checkout düzeltmesi `c624a73`, mevcut yerel `git log` çıktısında vardır.
Yerelleştirme başlangıç HEAD’i `c624a7315c8af246643a52fa0cb033cdd3745a53` değeridir.
Yukarıdaki uzak CI, bu sonraki commit’i veya yerel yerelleştirmeyi kapsamaz. Sonraki
uzak çalışmalar [Actions sayfasından](https://github.com/GorkemErtas/mini-dpp-platform/actions)
incelenebilir; bu oturumda onlar için ayrı bir başarı iddiası kurulmamıştır.

## Gereksinimlere uyum

| Gereksinim | Durum ve kanıt |
| --- | --- |
| CSV yükleme, UTF-8/BOM, bağımsız doğrulama, fiziksel satır hataları | Tamam: `CsvImporter`, `UploadEndpoint`; gerçek örnek, tırnaklı/çok satırlı alan, boş satır, hatalı kayıt ve kodlama testleri |
| GS1/GTIN metni, zorunlu metin, tam ondalık kuralları | Tamam: framework bağımsız `ProductValidation`; sınır/negatif birim testleri |
| Kısmi başarı, satır başına atomiklik, tekrar yükleme | Tamam: her geçerli satırda ayrı EF transaction; zorlanan sürüm hatası model/parti geri almasını ve devamı kanıtlar |
| İlişkili Model/Batch, kısıtlar, migration | Tamam: `DppDbContext`, başlangıç migration dosyası, benzersiz model/parti ve GTIN indeksleri, gerçek SQLite testleri |
| HTML `/dpp/{gtin}` | Tamam: kaçışlanmış, duyarlı, anlamsal HTML; bilinmeyen GTIN 404; TR/EN sorgu/başlık seçimi |
| schema.org Product JSON-LD | Tamam: `PassportOutputs.JsonLd`, doğru MIME ve PropertyValue; dil değişince birebir aynı makine verisi |
| Çözümlenebilir QR PNG | Tamam: QRCoder; ZXing tam yapılandırılmış tüketici URL’sini çözer; sahte Host ve rol hedefi değiştiremez |
| Tüketici/yetkili karbon süzmesi | Tamam: ortak `PassportPresenter`; HTML, JSON-LD, liste, ürün, geçmiş ve tek sürüm için iki rol; iki dilde regresyonlar |
| Değiştirilemez sürüm geçmişi bonusu | Tamam: v1’den tam durumlar, UTC, artan sürüm, değişmeyen yüklemeyi atlama, model ilişkilendirme, API ve zaman çizelgesi |
| React + TypeScript bonusu | Tamam: arama/yer filtresi, yükleme/tekrar/hatalar, ayrıntı/rol/QR/çıktılar/geçmiş, gerçek API |
| Erişilebilir duyarlı arayüz ve durumlar | Tamam: etiketler, odak, içeriğe geçiş, anlamsal yapı, durumlar, azaltılmış hareket; iki dilde klavye ve axe kontrolleri |
| Güvenlik ve hata yönetimi | Değerlendirme kapsamında tamam: sınırlı yükleme, güvenli hatalar, hatada karbon değeri yok, HTML kaçışı, sabit genel URL, CORS/sunucu ayarı, DTO, iptal |
| Kurulum ve belgeler | Tamam: temiz klon kurulumu, migration, örnekler, varsayımlar, özgün girdiler ve doğrulanmış commit geçmişi; dört belge Türkçe |
| TR/EN yerelleştirme | Tamam: Türkçe varsayılanı, anlık/kalıcı seçim, dil başlığı, doğrudan HTML, yerel tarih/sayı sunumu ve ortak hata sözlüğü |
| Derleme, test, biçim, lint ve CI | Yerel sonuçlar aşağıdadır; yayımlanmış eski CI kanıtı yalnızca kendi SHA’sı için geçerlidir |
| İnceleme/teslim kısıtları | İlk istekte staging/commit/push yapılmadı; sonraki açık kullanıcı talebi ayrı commit ve push işlemlerini yetkilendirdi. Reset, rebase, merge, dağıtım, PDF kaldırma veya geçmiş yeniden yazımı yapılmaz |

## Önceki temiz klon doğrulamasının kaydı

Önceki inceleme 2026-11-05 tarihinde Windows, çalışma alanı **.NET SDK 10.0.403 /
çalışma zamanı 10.0.14**, **Node 26.13.0**, **npm 11.20.0** ile yapılmıştır. CI,
Ubuntu üzerinde .NET 10 ve Node 24 hedefler.

`https://github.com/GorkemErtas/mini-dpp-platform.git` için yok sayılan
`.tools/submission-review` altında gerçek klon oluşturulmuştur; bağımlılık,
derleme çıktısı veya veritabanı kopyalanmamıştır. Yerel SDK yardımcısı kurulu .NET
10’u sağlamış; klon kendi kilitli bağımlılıklarını geri yüklemiştir. Belgelenen
başlatma profili klonun API dizininde yeni SQLite dosyasını oluşturup migration
uygulamıştır. Ana çalışma alanının demo veritabanı kullanılmamıştır.

Windows hatası yeniden üretildikten sonra `.gitattributes` klona kopyalanmış;
izlenen metinler mevcut indekslerinden `core.autocrlf=true` ile yeniden
oluşturulmuştur. Git LF bildirmiş; iki biçim denetimi geçmiştir. Böylece teslim
commit’i öncesinde önerilen checkout davranışı sınanmıştır; incelenen taban SHA
henüz bu düzeltmeyi içermemektedir.

Önceki kaydın sonuçları:

- **62 xUnit**, **11 Vitest** ve **1 Chromium uçtan uca akışı** başarılıdır.
  Akış; CSV, iki hatalı satır, pano, roller, geçmiş, HTML/JSON-LD/PNG ve mobil
  taşmayı kapsar.
- İçe aktarma, pano, masaüstü ayrıntı ve mobil ayrıntıda axe **sıfır WCAG A/AA
  ihlali** bildirmiştir. Otomatik tarama elle erişilebilirlik değerlendirmesini tamamlar.
- Gerçek ilk örnek yükleme: **5 toplam, 3 içe aktarılan, 2 reddedilen, 0 güncellenen,
  0 değişmeyen**. Tekrarda **3 değişmeyen, 2 reddedilen**.
- Değişen tek satır **1 güncellenen**, geçmiş **[2, 1]** üretmiştir. Karbon **12.4**
  yerine **14.25** olmuştur; sürüm 1 ve zamanı birebir korunmuştur. **14.250** tekrar
  yüklemesi **1 değişmeyen** ve hâlâ iki sürüm vermiştir. Chromium iki girdiyi göstermiştir.
- Sunucular kapatıldıktan sonra salt okunur SQLite incelemesi: **3 model, 3 parti,
  4 sürüm**, GTIN türü **text**, uygulanmış migration, `PRAGMA integrity_check = ok`
  ve `foreign_key_check` ihlali yok.
- Tüketici ve `rol=yetkili` HTTP denetimleri liste, ayrıntı, geçmiş, tek sürüm, HTML
  ve JSON-LD’de karbonun tutarlı çıkarıldığını/eklendiğini göstermiştir. Okumalar
  `Cache-Control: no-store` döndürmüştür.
- QR, sahte Host/role rağmen tam yapılandırılmış tüketici URL’sine çözülmüştür.
  PNG baytları, varsayılan `http://localhost:5173/dpp/{gtin}` URL’si ve HTML QR
  görselinin Chromium’da yüklenmesi doğrulanmıştır.
- Swagger JSON multipart/geçmiş şemalarını açıklamış; gerçek Swagger UI Vite vekili
  üzerinden açılmıştır. React ayrıntı, rol/çıktı bağlantıları tarayıcı konsol veya
  sayfa hatası olmadan çalışmıştır.
- Masaüstü/mobil ekran görüntüleri incelenmiştir. Özgün CSV/PDF baytları korunmuştur.

Önceki klonda gerçekten çalıştırılan ek komutlar ve sonuçları:

| Komut | Önceki inceleme sonucu |
| --- | --- |
| `dotnet restore backend/MiniDpp.sln --locked-mode` | Kilitli bağımlılıklarla başarılı |
| `dotnet build backend/MiniDpp.sln --no-restore --configuration Release` | Sıfır uyarı/hata |
| `dotnet test backend/MiniDpp.sln --no-build --configuration Release` | 62 başarılı; başarısız/atlanan yok |
| `dotnet format backend/MiniDpp.sln --no-restore --verify-no-changes` | Checkout düzeltmesinden sonra başarılı; önce CRLF nedeniyle başarısız |
| `dotnet tool restore` | Depodaki EF aracı 10.0.14 geri yüklendi |
| `dotnet ef migrations has-pending-model-changes --project backend/src/MiniDpp.Infrastructure --startup-project backend/src/MiniDpp.Api --configuration Release --no-build` | Bekleyen model değişikliği yok |
| `dotnet list backend/MiniDpp.sln package --vulnerable --include-transitive` | O tarihte bilinen savunmasız paket bildirilmedi |
| `npm ci` | Temiz kurulum; bildirilen güvenlik açığı yok |
| `npm run typecheck` / `npm run lint` / `npm run format:check` | Başarılı; biçim denetimi önce CRLF nedeniyle başarısız, düzeltmeden sonra başarılı |
| `npm test` / `npm run build` | 11 test ve üretim derlemesi başarılı |
| `npx playwright install chromium` / `npm run test:e2e` | `CI=true`, otomatik sunucular ve boş yalıtılmış veritabanıyla 1 akış başarılı |
| Geçici HTTP + Chromium doğrulama betiği | İkinci boş klon veritabanında örnek/tekrar/değişiklik/eşdeğer yüklemeler, değişmeyen v1, görünürlük, QR, geçmiş ve Swagger başarılı |

Ön uç komutları `frontend/`, arka uç komutları kökten çalışmıştır. Kısıtlı ortam,
başta Git alt süreçlerini ve .NET geri yüklemeyi engellemiş; gerekli işlemler
onaylı yürütmeyle tamamlanmıştır. Önceki geçici betikler, klon, günlükler,
görüntüler ve veritabanları yok sayılan `.tools/` altındadır. İncelemenin başlattığı
sunucular doğrulama sonunda durdurulmuştur. Bunlar tarihsel kayıttır; yukarıdaki ek
migration/savunmasız paket komutları bu yerelleştirmede yeniden çalıştırılmış sayılmaz.

## Bu oturumun yerelleştirme davranışı

React’in `frontend/src/i18n/{en,tr}.ts` sözlükleri ve `useSyncExternalStore` tabanlı
dil durumu ek bağımlılık gerektirmez. İlk ziyarette Türkçe seçilir. Üst gezinmedeki
TR/EN düğmeleri anında metinleri, `html lang`, başlık/açıklama ve erişilebilirlik
etiketlerini değiştirir. `localStorage` seçimi yenileme/gezinmede korur; kapalı
saklama durumunda dil değiştirme çalışmaya devam eder. Sekmeler arası saklama
olayları da izlenir. Klavye odağı dil düğmesinde kalır; rol anahtarı değişiminde
önceki karbon verisini atma davranışı korunur.

Tüm fetch istekleri `Accept-Language` taşır. API, doğrulama raporunu ve Problem
Details metinlerini HTTP sınırında yerelleştirir. Ortak `localization/server-messages.json`
API derlemesine gömülür, React tarafından da kullanılır. Saklanan yükleme sonuçları
dil değişince tekrar gönderim olmadan çevrilir. İç kimlikler, günlükler ve hata
alan adları değişmez. Bilinmeyen iç hata metni güvenli genel iletiye düşer.

HTML’de geçerli `lang=tr|en`, `/dpp` yollarında başlıktan önceliklidir; aksi durumda
`Accept-Language`, sonra Türkçe uygulanır. React bağlantısı dili taşır; HTML’nin
dil bağlantıları demo rolünü korur. Doğrudan gezinme her iki dilde çalışır. Tarihler
UTC olarak, sayılar Türkçe/İngilizce kültürle sunulur. JSON/JSON-LD sayıları ve
kimlikleri aynı kalır. QR URL’si dil/rol eklemeden tüketici hedefine yönelir.

`README.md`, bu belge, `IMPLEMENTATION.md` ve `COMMITS.md` Türkçedir. Komutlar,
API yolları, kod/JSON alanları, URL’ler, SHA’lar ve özgün commit başlıkları korunur.
Önceki inceleme onayları yalnızca tarihsel bağlamdır. Yerelleştirme önce commit
edilmeden bırakılmış; sonraki açık kullanıcı talebi commit ve push için yetki vermiştir.

## Bu oturumda çalıştırılan kontroller — 2026-11-05

Ortam: Windows, **.NET SDK 10.0.403**, **Node 26.13.0**, **npm 11.20.0**. Testler
çalışma ağacındaki yerelleştirmeyi denetler. Arka uç testleri ayrı gerçek SQLite
veritabanları, Playwright `CI=true` ile otomatik sunucular ve geçici veritabanı kullanır.

| Komut | Gerçek sonuç |
| --- | --- |
| `dotnet restore backend/MiniDpp.sln --locked-mode` | Başarılı; kısıtlı yürütmenin ilk denemesi başarısız, onaylı yürütmede tamamlandı |
| `dotnet build backend/MiniDpp.sln --no-restore --configuration Release` | Başarılı; sıfır uyarı/hata |
| `dotnet test backend/MiniDpp.sln --no-build --configuration Release` | 83 başarılı; mevcut 62 ve 21 yerelleştirme durumu |
| `dotnet format backend/MiniDpp.sln --no-restore --verify-no-changes` | Başarılı; değişiklik gerekmiyor |
| `npm ci --cache ../.tools/npm-cache` | Başarılı; 269 paket, bildirilen güvenlik açığı yok; ilk kısıtlı deneme `spawn EPERM`, onaylı yürütmede tamamlandı |
| `npm run typecheck` | Başarılı |
| `npm run lint` | Başarılı |
| `npm run format:check` | Başarılı |
| `npm test` | 19 başarılı; mevcut 11 ve 8 yerelleştirme testi |
| `npm run build` | Başarılı; TypeScript ve Vite üretim çıktısı |
| `npm run test:e2e` | 2 başarılı; mevcut işlev akışı ve yeni yerelleştirme akışı |

İlk ön uç kontrolü bir test seçeneği tip hatası, yakalanan hatanın nedenini koruma
lint kuralı ve Node 26/jsdom `localStorage` çakışması bulmuştur. Düzeltilmiştir.
Türkçe hazırlık yönergesiyle aynı metni taşıyan doğrulama hatası için test seçicisi
hata tablosuna daraltılmış; işlevsel iddia korunmuştur. Sonraki kontroller yukarıdaki
başarılı sonuçları vermiştir. Biçimlendiriciler uygulanmıştır; başarılı son denetimler
ilk hataları gizlemek için kullanılmamıştır.

Yeni testler; Türkçe varsayılanı, TR → EN → TR, saklama engeli, sekmeler, yenileme,
gezinme, API dil başlığı, yeniden yüklemeden rapor çevirisi, yer tutucu tamlığı,
yerel tarih/sayı, başlık ağırlıkları, güvenli 400/404/415/500 hataları ve doğrudan
HTML’i kapsar. İki dilde tüm veri okuma yüzeylerinin birebir eşitliği ve QR baytları
karşılaştırılmıştır. Aynı CSV’nin diğer dilde tekrar yüklenmesi sürüm üretmez.

Playwright, iki dilde **1280, 390 ve 320 piksel** ayrıntı görünümlerinde yatay taşma
olmadığını ve taranan axe WCAG A/AA kurallarında **sıfır ihlal** olduğunu doğrular.
Özgün akış ayrıca içe aktarma, pano ve masaüstü/mobil ayrıntıyı tarar. Otomatik
tarama, elle erişilebilirlik incelemesinin tamamı değildir.

Özgün girdilerin bu oturumda yeniden hesaplanan SHA-256 değerleri değişmemiştir:

- CSV: `A3C4189EA0EDB327A0E2EB67B6FEEBE0DF0370A96162B476C91285B458E7A107`
- PDF: `0CEEF3AC96F49AA7A1A5E23FBFFD78B0E571AEBC98AD288A3D36F440C6FCAC81`

Uygulama doğrulaması sonunda `git diff --check` başarılıydı ve HEAD başlangıç
SHA’sıyla aynıydı. Kullanıcının sonraki commit/push talebi üzerine backend ve
testleri `3a2fa4e`, frontend ve testleri `2eeddc1` olarak ayrı kaydedilmiştir.
Türkçe belgeler üçüncü ayrı commit’tir; önceki geçmiş yeniden yazılmaz.
Playwright’ın başlattığı 5080/5173 dinleyicileri testlerden sonra kapalıdır.
Türkçe masaüstü/mobil ekran görüntüleri gözle incelenmiş; mobilde gizlenen satır
sonları arasındaki eksik boşluklar düzeltilip bütün ön uç kontrolleri ve iki
tarayıcı akışı yeniden başarıyla çalıştırılmıştır. Görüntüler yok sayılan
`.tools/screenshots/detail-{tr,en}-{1280,390}.png` dosyalarındadır.

## Değişen dosyalar

Toplam **31 dosya**; yeni kaynaklar dâhil, başlangıçta staging yapılmadan
incelemeye bırakılmış, sonraki kullanıcı talebiyle üç mantıksal commit’e ayrılmıştır:

```text
README.md
docs/REVIEW.md
docs/IMPLEMENTATION.md
docs/COMMITS.md
backend/src/MiniDpp.Api/MiniDpp.Api.csproj
backend/src/MiniDpp.Api/Localization.cs
backend/src/MiniDpp.Api/PassportOutputs.cs
backend/src/MiniDpp.Api/Program.cs
backend/src/MiniDpp.Api/UploadEndpoint.cs
backend/tests/MiniDpp.Tests/LocalizationTests.cs
backend/tests/MiniDpp.Tests/WorkflowTests.cs
frontend/index.html
frontend/src/App.tsx
frontend/src/DetailPage.tsx
frontend/src/ImportPage.tsx
frontend/src/ProductsPage.tsx
frontend/src/LanguageSwitcher.tsx
frontend/src/api.ts
frontend/src/components.tsx
frontend/src/format.ts
frontend/src/styles.css
frontend/src/i18n/index.ts
frontend/src/i18n/en.ts
frontend/src/i18n/tr.ts
frontend/tests/api.test.ts
frontend/tests/localization.test.tsx
frontend/tests/setup.ts
frontend/tests/workflows.test.tsx
frontend/tests/e2e/localization.spec.ts
frontend/tests/e2e/passports.spec.ts
localization/server-messages.json
```

## Depo içeriği ve inceleme başlangıç noktaları

Başlangıç deposu tek satırlık README içeriyordu. Uygulama deposu artık şunları içerir:

- Arka uç: çözüm ve beş proje; varlıklar/doğrulama, sözleşmeler/sunum bileşeni, içe
  aktarma/okuma/EF context, üretilmiş migration, HTTP/çıktı/hata/yapılandırma,
  bağımlılık kilitleri ve xUnit testleri.
- Ön uç: paket/kilit ve araç ayarları; tipli API, gezinme, ürün/yükleme/ayrıntı,
  ortak bileşenler, duyarlı CSS, favicon, birim/akış ve tarayıcı/erişilebilirlik testleri.
- İnceleme/geliştirici deneyimi: README, özgün PDF/CSV, uygulama listesi, doğrulama
  kaydı, gerçek commit geçmişi, SDK yardımcısı, GitHub Actions, SDK/araç bildirimleri,
  düzenleyici/checkout/yok sayma ayarları. Yerelleştirme ortak sözlükleri de eklenmiştir.

Derleme çıktıları, test tanıları, yerel veritabanları ve çalışma alanına özgü araçlar
Git tarafından yok sayılır.

1. `ProductValidation.cs`: GS1 ağırlıkları ve ondalık doğrulaması.
2. `CsvImporter.cs`: dosya ayrıştırma, bağımsız doğrulama, satır transaction işlemi.
3. `DppDbContext.cs` ve migration: parti sahipliği ve benzersizlik.
4. `PassportPresenter` / `PassportOutputs.cs`: tüm çıktılarda karbon süzmesi.
5. `WorkflowTests.cs`: sürüm yazma hatası geri alma ve görünürlük regresyonları.
6. `DetailPage.tsx`: rol değişince eski veriyi atma, odağı koruma, yeniden getirme.
7. `Localization.cs`, `i18n/` ve `LocalizationTests.cs`: sunumda dil ve sözlükler.

## Sınırlamalar ve kalan metinler

Denetlenen akışlarda açık zorunlu özellik veya bonus kusuru bulunmamıştır. Gerçek
yetkilendirme, bulut dağıtımı ve Docker değerlendirme kapsamı dışındadır. Yerel
sunucular ve küçük, sayfalanmamış katalog kullanılır; hatalı tırnak, eş zamanlılık
ve üretim sunumu tercihleri README’de açıklanır.

Uygulamanın kullanıcıya yönelik sabit React/HTML ve doğrulama/hata metinlerinde
bilinen çeviri eksiği yoktur. Özgün model/parti/yer verisi, `GTIN`, `kg CO2e`, API/CSV
alanları, JSON-LD property adları ve Swagger/OpenAPI’nin teknik geliştirici
metinleri bilinçli olarak korunur. Dosya seçicisinin işletim sistemine ait metinleri
tarayıcı/işletim sistemi dilini kullanır. Commit başlıkları da istendiği gibi özgündür.

Önceki incelemede PDF kararı açık kalmıştır. Sonraki bir commit ile kaldırılması
eski herkese açık geçmişten silmez. Bu oturum kaldırma veya geçmiş yeniden yazımı
yapmaz; bu tarihsel yayın notu doğrulanmış uygulama sonuçlarını değiştirmez.
