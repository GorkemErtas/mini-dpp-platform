# Doğrulanmış artımlı commit geçmişi

2026-11-05 tarihinde salt okunur yerel `git log --oneline --reverse` ve
`git rev-parse HEAD` komutlarıyla mevcut geçmiş yeniden doğrulanmıştır. Yerelleştirme
başlangıç HEAD’i **`c624a7315c8af246643a52fa0cb033cdd3745a53`** değeridir.

Önceki teslim incelemesi, yerel geçmiş, temiz herkese açık klon ve GitHub dal/çalışma
API’leri üzerinden yapılmış; o incelemenin başlangıcındaki `main` ve yerel HEAD
**`b5f86b8a022c3f88b189acac3abfd3fa1d8dd966`** olarak kaydedilmiştir. İlk commit ve
onu izleyen dokuz artımlı commit’in yayımlanmış olması bu tarihsel kaydın parçasıdır.
Mevcut yerel geçmişte sonraki inceleme düzeltmesi de vardır:

| Commit | Özgün başlık |
| --- | --- |
| `9bb56db` | Initial commit |
| `e12197a` | chore(repo): configure SDK tooling and repository conventions |
| `37f8f58` | feat(domain): add product models validation and passport contracts |
| `9700feb` | feat(persistence): add atomic CSV imports and versioned SQLite storage |
| `ee83599` | feat(api): expose product passports QR codes and demo visibility |
| `6c72415` | test(backend): cover validation imports passports and version history |
| `485a69a` | feat(frontend): add product dashboard import and passport views |
| `34d1c01` | test(frontend): cover UI workflows and browser accessibility |
| `07c69fd` | docs: document setup architecture and assessment acceptance |
| `b5f86b8` | ci: add backend frontend and browser checks |
| `c624a73` | fix(repo): preserve checkout bytes and correct review evidence |
| `3a2fa4e` | feat(api): add Turkish and English passport localization |
| `2eeddc1` | feat(frontend): add persistent Turkish and English language switching |

[Herkese açık commit geçmişi](https://github.com/GorkemErtas/mini-dpp-platform/commits/main/)
incelenebilir. Artımlı geçmişi sonradan oluşturmayı öneren eski plan geçersizdir;
tabloda gerçek geçmiş vardır. SHA değerleri ve özgün Conventional Commit başlıkları
çeviri sırasında değiştirilmemiştir.

## Doğrulanmış CI kanıtı

[1 numaralı Build and test çalışması](https://github.com/GorkemErtas/mini-dpp-platform/actions/runs/41825678774),
2026-11-04 tarihinde incelenen `b5f86b8` SHA’sı için `main` dalına gönderimle
başlamıştır. Önceki inceleme kaydına göre 1. denemede **12:01:19 UTC (15:01:19
Türkiye saati)** itibarıyla başlamış ve **12:02:32 UTC (15:02:32 Türkiye saati)**
itibarıyla başarıyla tamamlanmıştır. İşler ve adımları 2026-11-05 yerelleştirmesi
sırasında GitHub `fetch_workflow_run_jobs` aracıyla yeniden sorgulanmıştır:

| İş | Doğrulanmış sonuç |
| --- | --- |
| backend | Başarılı: kilitli geri yükleme, Release derleme, biçim denetimi ve xUnit |
| frontend | Başarılı: npm ci, tip denetimi, lint, biçim, Vitest ve üretim derlemesi |
| browser | Başarılı: bağımlılık kurulumu, Chromium kurulumu ve Playwright akışı |

Bu uzak sonuç yalnızca incelenen taban SHA’yı kapsar. `c624a73` veya yerelleştirme
commit’leri için bu çalışmadan CI başarısı çıkarılamaz. Bu oturumda
sonraki commit için ayrı uzak CI sonucu doğrulanmamıştır. Yerel sonuçlar
[REVIEW.md](REVIEW.md), diğer uzak çalışmalar
[Actions sayfasındadır](https://github.com/GorkemErtas/mini-dpp-platform/actions).

## İnceleme ve mevcut değişiklikler

Önceki inceleme belgeleri düzeltmiş ve Windows’ta tekrarlanabilir biçimlendirme ile
özgün girdi baytları için `.gitattributes` eklemiştir; uygulama kaynağını, şemayı,
API sözleşmelerini, PDF’yi veya geçmişi değiştirmemiştir. Önce commit edilmeden
bırakılan bu düzeltmeler, sonraki açık sahip onayıyla `c624a73` olarak kaydedilmiştir.

Mevcut yerelleştirme React, HTTP/HTML sunumu, testler ve Türkçe belgeleri günceller.
İlk istekte değişiklikler staging ve commit yapılmadan incelemeye bırakılmıştır.
Kullanıcının sonraki açık “ayırarak commitle ve pushla” talebiyle backend ve ilgili
testleri `3a2fa4e`, frontend ve ilgili testleri `2eeddc1` olarak kaydedilmiştir.
Türkçe belgeler bunları izleyen ayrı `docs` commit’inde tutulur; bu belgenin kendi
commit SHA’sı `git log` üzerinden görülebilir. Kullanıcı mevcut `main` dalına push
işlemini de yetkilendirmiştir. Önceki commit’ler ve tarihleri değiştirilmez;
reset, rebase, merge veya geçmiş yeniden yazımı yapılmaz.

Depo kökünden salt okunur inceleme komutları:

```sh
git status --short
git log --oneline --reverse
git diff --stat
git diff --check
git diff
```
