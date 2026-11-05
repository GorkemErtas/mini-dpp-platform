using System.Globalization;
using System.Text.Json;
using MiniDpp.Application;
using MiniDpp.Domain;

namespace MiniDpp.Api;

// Presentation-only localization: domain errors and exception logs keep their original text.
public static class Text
{
    private sealed record Message(string En, string Tr);
    private static readonly Dictionary<string, Message> Messages = LoadMessages();
    public static bool IsTurkish => CultureInfo.CurrentUICulture.TwoLetterISOLanguageName != "en";
    public static string Language => IsTurkish ? "tr" : "en";
    public static CultureInfo Culture => CultureInfo.GetCultureInfo(IsTurkish ? "tr-TR" : "en-US");
    public static string Get(string key) => IsTurkish ? Messages[key].Tr : Messages[key].En;

    public static string Localize(string message)
    {
        var entry = Messages.Values.FirstOrDefault(value => value.En == message || value.Tr == message);
        if (entry is not null) return IsTurkish ? entry.Tr : entry.En;
        var prefix = Messages["missingColumns"];
        if (message.StartsWith(prefix.En, StringComparison.Ordinal))
            return Get("missingColumns") + message[prefix.En.Length..];
        return Get("requestFailed");
    }

    public static ImportReport Localize(ImportReport report) => new()
    {
        Total = report.Total,
        Imported = report.Imported,
        Updated = report.Updated,
        Unchanged = report.Unchanged,
        Errors = report.Errors.Select(row => new ImportError(row.Row,
            row.Errors.Select(error => new FieldError(error.Field, Localize(error.Message))).ToArray())).ToList()
    };

    private static Dictionary<string, Message> LoadMessages()
    {
        using var stream = typeof(Text).Assembly.GetManifestResourceStream("MiniDpp.Api.ServerMessages.json")!;
        var messages = JsonSerializer.Deserialize<Dictionary<string, Message>>(stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        if (messages.Values.Any(message => string.IsNullOrWhiteSpace(message.En) || string.IsNullOrWhiteSpace(message.Tr)))
            throw new InvalidOperationException("All server messages require both English and Turkish translations.");
        return messages;
    }
}

internal static class PassportText
{
    static PassportText()
    {
        if (!En.Keys.ToHashSet().SetEquals(Tr.Keys) || En.Values.Concat(Tr.Values).Any(string.IsNullOrWhiteSpace))
            throw new InvalidOperationException("Passport translation catalogs must contain the same nonempty keys.");
    }

    public static string Get(string key) => (Text.IsTurkish ? Tr : En)[key];
    private static readonly Dictionary<string, string> En = new()
    {
        ["title"] = "Digital Product Passport",
        ["transparency"] = "Product transparency",
        ["version"] = "Version",
        ["information"] = "Product information",
        ["batch"] = "Batch number",
        ["composition"] = "Fiber composition",
        ["cotton"] = "cotton",
        ["elastane"] = "elastane",
        ["location"] = "Manufacturing location",
        ["carbon"] = "Carbon footprint · authorized demo",
        ["qr"] = "Passport QR code",
        ["qrAlt"] = "QR code linking to this product passport",
        ["takeWithYou"] = "Take the passport with you",
        ["scan"] = "Scan to open the consumer passport.",
        ["download"] = "Download QR PNG",
        ["jsonLd"] = "View JSON-LD",
        ["updated"] = "Updated",
        ["demo"] = "Visibility is demonstration-only; the role query parameter is not authorization.",
        ["language"] = "Language"
    };
    private static readonly Dictionary<string, string> Tr = new()
    {
        ["title"] = "Dijital Ürün Pasaportu",
        ["transparency"] = "Ürün şeffaflığı",
        ["version"] = "Sürüm",
        ["information"] = "Ürün bilgileri",
        ["batch"] = "Parti numarası",
        ["composition"] = "Elyaf bileşimi",
        ["cotton"] = "pamuk",
        ["elastane"] = "elastan",
        ["location"] = "Üretim Yeri",
        ["carbon"] = "Karbon Ayak İzi · yetkili demo",
        ["qr"] = "Pasaport QR kodu",
        ["qrAlt"] = "Bu ürün pasaportunu açan QR kodu",
        ["takeWithYou"] = "Pasaportunuz yanınızda olsun",
        ["scan"] = "Tüketici pasaportunu açmak için tarayın.",
        ["download"] = "QR PNG indir",
        ["jsonLd"] = "JSON-LD verilerini görüntüle",
        ["updated"] = "Güncelleme:",
        ["demo"] = "Yalnızca görünürlük demosudur; rol sorgu parametresi yetkilendirme sağlamaz.",
        ["language"] = "Dil"
    };
}
