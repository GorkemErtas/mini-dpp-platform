# Uygulama ve kabul planı

Başlangıç uygulamasında `Mini_DPP_Teknik_Odev_ESG_Next.pdf` dosyasının iki sayfası ve
`urunler_duzeltilmis_test.csv` dosyasının beş veri kaydı bütünüyle incelenmiştir.
Örnek CSV, `samples` dizinine baytları değiştirilmeden alınmıştır; düzenlenmemeli
veya Excel üzerinden yeniden kaydedilmemelidir.

## A. Gereksinim listesi

- [x] Zorunlu: CSV yükleme, bağımsız satır doğrulaması, fiziksel satır numaraları.
- [x] Zorunlu: 14 karakterlik GTIN metnini koruma ve GS1 kontrol basamağı doğrulaması.
- [x] Zorunlu: [0,100] aralığında, toplamı 100 olan ondalık elyaf yüzdeleri;
  negatif olmayan karbon; boş olmayan model, parti ve üretim yeri.
- [x] Zorunlu: SQLite üzerinde ilişkili Model → Batch kalıcılığı.
- [x] Zorunlu: okunabilir `/dpp/{gtin}` HTML’i ve schema.org Product JSON-LD.
- [x] Zorunlu: HTML pasaportuna yönlenen gerçek PNG QR.
- [x] Zorunlu: karbonun varsayılan gizli, `?rol=yetkili` ile iki çıktıda görünür olması.
- [x] Zorunlu: README’de tekrarlanabilir kurulum, örnek akış ve tasarım kararları.
- [x] Bonus: React + TypeScript arayüzü.
- [x] Bonus: tam, değiştirilemez ürün sürüm geçmişi.
- [x] Genişletilmiş uygulama kapsamı: migration, DTO, sınırlı yükleme, CORS, tutarlı
  hatalar, otomatik arka uç/ön uç testleri, OpenAPI ve CI. Bunlar PDF’nin zorunlu
  maddelerine ek uygulama kararlarıdır; bulut dağıtımı zorunlu değildir.
- [x] Sonraki yerelleştirme isteği: varsayılan Türkçe, anlık TR/EN değişimi, kalıcı
  seçim, tipli sözlükler, yerel biçimlendirme, iki dilli API/HTML ve Türkçe belgeler.

## B. Şema ve güncelleme kuralları

- **ProductModel**: tamsayı PK; kırpılmış, büyük/küçük harfe duyarlı benzersiz ad.
  Model adları ortak kimliklerdir; değişken bileşim/üretim verisi burada tutulmaz.
- **Batch**: tamsayı PK, zorunlu model FK, benzersiz metin GTIN, parti numarası,
  pamuk, elastan, üretim yeri, karbon, sürüm ve UTC güncelleme zamanı.
  `(ModelId, Number)` benzersizdir; aynı model/parti kimliği başka GTIN alamaz.
- **ProductRevision**: tamsayı PK, batch FK, benzersiz `(BatchId, Version)`;
  model adı ve UTC zamanı dâhil değiştirilemez tam durum. Oluşturulurken sürüm 1
  saklanır; değişen yüklemeler güncel durumla aynı transaction içinde N+1 ekler.
- Elyaf ve üretim verisi partiye aittir; reçete ve salım farklı olabilir. Model adı
  değişince yalnızca o GTIN yeniden ilişkilendirilir; başka parti yazılmaz.
  Yeniden ilişkilendirme sonrası model kalabilir.
- Normalize edilmiş aynı değerler değişiklik sayılmaz. Her satırın ayrı
  transaction işlemi vardır. Çakışma satırı reddeder; model/sürüm artığı bırakmaz.
  Dosyada yinelenen GTIN’ler sonraki yüklemelerle aynı kurallarla sırayla işlenir.
- SQLite ondalıkları kültürden bağımsız metin saklar. Doğrulama .NET `decimal`
  aritmetiğidir; kayan nokta eşitliğine dayanmaz.
- Ortak sunum bileşeni, tüketici DTO, HTML, JSON-LD ve geçmişten karbonu tamamen çıkarır.

## C. Sözleşmeler ve arayüz

| Yöntem | Yol | Sözleşme |
| --- | --- | --- |
| POST | /api/import/csv | multipart `file`; total/imported/updated/unchanged/failed/errors |
| GET | /api/products?q= | role göre süzülmüş DTO dizisi; isteğe bağlı arama |
| GET | /api/products/{gtin} | pasaport DTO’su veya 404 |
| GET | /api/products/{gtin}/history | azalan sürüm DTO’ları veya 404 |
| GET | /api/products/{gtin}/history/{version} | sürüm DTO’su veya 404 |
| GET | /dpp/{gtin} | erişilebilir HTML veya 404 |
| GET | /dpp/{gtin}.jsonld | application/ld+json veya 404 |
| GET | /dpp/{gtin}/qr.png | yapılandırılmış mutlak tüketici HTML URL’sini içeren PNG |

Okuma yolları QR dışında `?rol=yetkili` destekler; QR daima tüketici URL’sidir.
Yanıtlar önbelleğe alınmaz. Bu parametre bir görünürlük demosudur; yetkilendirme
sağlamaz. Dosya hataları Problem Details, bağımsız satır reddi ise güvenli alan
hataları ve fiziksel başlangıç satırları içeren başarılı içe aktarma raporu döndürür.

Sayfalar: aranabilir ürün panosu; tekrar deneme ve satır hataları içeren yükleme;
bileşim, QR önizleme/indirme, çıktı bağlantıları, rol anahtarı ve zaman çizelgesi
olan ayrıntı görünümü. Yüklenme/hata/boş durumları ve duyarlı, klavyeyle
kullanılabilir kontroller bulunur.

## D. Dizin yapısı

```text
backend/src/MiniDpp.{Domain,Application,Infrastructure,Api}/
backend/tests/MiniDpp.Tests/
frontend/{src,tests}/
frontend/src/i18n/
localization/
samples/
docs/
.github/workflows/
```

## E. Aşamalar ve kontrol noktaları

1. Projeleri oluşturma; bağımlılık geri yükleme ve LTS SDK doğrulaması.
2. Etki alanı doğrulaması, şema/migration, atomik CSV aktarımı; örneğin tam sonucu
   ile tekrar/değişiklik/çakışma davranışını kontrol etme.
3. Ortak süzülmüş DTO, HTML, JSON-LD, QR, geçmiş ve OpenAPI; görünürlük sızıntısı,
   tutarlılık, 404 ve çözümlenen QR hedefini doğrulama.
4. Tipli React arayüzü; yükleme/hata/rol anahtarı ve duyarlı tasarımı doğrulama.
5. Arka uç test/derleme/biçim ile ön uç test/tip/lint/derleme kontrollerini çalıştırma.
6. README, CI, gereksinim eşlemesi ve gerçek artımlı geçmiş kaydını tamamlama.
7. Sonraki TR/EN yerelleştirmesi; iş kurallarını değiştirmeden sunum katmanını ve
   Türkçe belgeleri güncelleme, dil ve işlev regresyonlarını doğrulama.

## F. Teslim incelemesi durumu — 2026-11-05

Önceki teslim incelemesinde PDF’nin yedi zorunlu maddesi, React + TypeScript
avantajı ve değiştirilemez geçmiş bonusu tekrar denetlenmiştir. İnceleme
başlangıcındaki yayımlanmış taban
`b5f86b8a022c3f88b189acac3abfd3fa1d8dd966` idi. İlk commit’i dokuz artımlı commit
izler; gerçek başlıklar [COMMITS.md](COMMITS.md) içindedir. GitHub Actions
[1 numaralı çalışma](https://github.com/GorkemErtas/mini-dpp-platform/actions/runs/41825678774)
2026-11-04 tarihinde başarılı olmuştur; arka uç, ön uç ve tarayıcı işlerinin
başarıları bu yerelleştirme sırasında GitHub aracıyla yeniden doğrulanmıştır.

Önceki temiz klon incelemesi, Windows’ta `core.autocrlf=true` nedeniyle CSV hash’inin
ve kaynak satır sonlarının değiştiğini, iki biçim denetiminin bozulduğunu
belgelemiştir. `.gitattributes`, LF kaynak dosyalarını ve özgün girdi baytlarını
korumak için eklenmiştir. Klon dosyalarının bu kuralla yeniden oluşturulması özgün
CSV hash’ini ve biçim denetimlerini düzeltmiştir. Ayrıntılar [REVIEW.md](REVIEW.md)
içindedir. Sonraki düzeltme commit’i `c624a73`, mevcut yerel geçmişte doğrulanmıştır;
yerelleştirme başlangıç HEAD’i `c624a7315c8af246643a52fa0cb033cdd3745a53` değeridir.

PDF, örnek CSV’nin eklenmesine izin verir; değerlendirme PDF’sinin herkese açık
dağıtımını açıkça ele almaz. Bu, önceki incelemede sahibine bırakılmış bir yayın
kararıdır. PDF ve Git geçmişi bu çalışmada değiştirilmez. Önceki incelemenin
başlangıçta commit edilmeden bırakılan düzeltmeleri, sonraki sahip onayıyla
kaydedilmiştir. Yerelleştirme ilk istekte commit edilmeden incelemeye bırakılmıştır.
Kullanıcının sonraki açık talebiyle backend/testler, frontend/testler ve Türkçe
belgeler üç ayrı commit’e ayrılır ve mevcut `main` dalına gönderilir. Bu yetki
önceki tarihsel onaydan değil, yeni kullanıcı talebinden gelir. Geçmiş yeniden
yazımı, PDF kaldırma veya dağıtım yapılmaz. Uzak çalışmalar
[GitHub Actions](https://github.com/GorkemErtas/mini-dpp-platform/actions) üzerinden izlenebilir.

## G. Yerelleştirme uygulaması

- `frontend/src/i18n/{en,tr}.ts`: merkezi anahtarlar; `tr` sözlüğü İngilizce sözlüğün
  anahtar kümesini statik olarak karşılar. Testler boş metin ve yer tutucu farklarını yakalar.
- `index.ts`: Türkçe varsayılanı, `localStorage`, sekmeler arası saklama olayı,
  `useSyncExternalStore`, çeviri ve saklanan hata iletilerini yeniden sunma.
- `LanguageSwitcher.tsx`: üst gezinmede TR/EN; görünür etkin durum, `aria-pressed`,
  yerel dil adları, klavye desteği ve mobil dokunma hedefleri.
- `localization/server-messages.json`: React/API ortak hata metinleri. API kaynağına
  gömülür; dağıtımda haricî dosya okuma veya ön uç derlemesi gerektirmez.
- `MiniDpp.Api/Localization.cs`: sunum sınırında satır/Problem Details çevirisi ve
  HTML etiketleri. Etki alanı, CSV ayrıştırıcısı, günlükler ve veritabanı değişmez.
- `Accept-Language`, API’nin temel seçimidir; eksik/desteklenmeyen dil Türkçedir.
  `/dpp` için geçerli `lang=tr|en` başlıktan önce gelir. React’in HTML bağlantısı dili
  taşır; bağımsız HTML dil bağlantıları demo rolünü korur.
- Tarih/sayı sunumu `tr-TR` / `en-US` kullanır; UTC, JSON sayıları, GTIN, noktalı
  CSV ayrıştırması ve JSON-LD kimlikleri korunur. QR daima rol içermeyen tüketici URL’sidir.
- Türkçe belgelerde terminal komutları, yollar, JSON alanları, hash/SHA değerleri
  ve özgün commit başlıkları korunur. Yeni paket veya migration eklenmez.

Güncel komut sonuçları ve kapsam sınırları [REVIEW.md](REVIEW.md) içindedir.
