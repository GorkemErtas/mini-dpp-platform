using System.Net;
using MiniDpp.Application;
using QRCoder;

namespace MiniDpp.Api;

public sealed class PublicUrls
{
    private readonly string baseUrl;

    public PublicUrls(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https")
            || !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Query) || !string.IsNullOrEmpty(uri.Fragment))
            throw new ArgumentException("PublicBaseUrl must be an absolute HTTP(S) URL without credentials, query or fragment.");
        baseUrl = uri.AbsoluteUri.TrimEnd('/');
    }

    public string Passport(string gtin) => $"{baseUrl}/dpp/{Uri.EscapeDataString(gtin)}";
}

public static class PassportOutputs
{
    public static byte[] Qr(string url)
    {
        using var data = QRCodeGenerator.GenerateQrCode(url, QRCodeGenerator.ECCLevel.Q);
        using var code = new PngByteQRCode(data);
        return code.GetGraphic(8);
    }

    public static object JsonLd(Passport product, PublicUrls urls)
    {
        var properties = new List<object>
        {
            Property("Batch number", product.BatchNumber),
            Property("Cotton", product.Cotton, "%"),
            Property("Elastane", product.Elastane, "%"),
            Property("Manufacturing location", product.Location),
            Property("Passport version", product.Version)
        };
        if (product.CarbonKgCo2e is { } carbon) properties.Add(Property("karbon_kg_co2e", carbon, "kg CO2e"));
        return new Dictionary<string, object>
        {
            ["@context"] = "https://schema.org",
            ["@type"] = "Product",
            ["@id"] = urls.Passport(product.Gtin),
            ["url"] = urls.Passport(product.Gtin),
            ["name"] = product.ModelName,
            ["model"] = product.ModelName,
            ["gtin14"] = product.Gtin,
            ["additionalProperty"] = properties
        };
    }

    private static object Property(string name, object value, string? unit = null)
    {
        var result = new Dictionary<string, object> { ["@type"] = "PropertyValue", ["name"] = name, ["value"] = value };
        if (unit is not null) result["unitText"] = unit;
        return result;
    }

    public static string Html(Passport product, PublicUrls urls)
    {
        static string E(string value) => WebUtility.HtmlEncode(value);
        static string N(decimal value) => value.ToString("0.############################", Text.Culture);
        static string T(string key) => E(PassportText.Get(key));
        static string Percent(decimal value, string key) => Text.IsTurkish ? $"%{N(value)} {T(key)}" : $"{N(value)}% {T(key)}";
        var url = E(urls.Passport(product.Gtin));
        var role = product.CarbonKgCo2e.HasValue ? "?rol=yetkili" : "";
        var languageRole = product.CarbonKgCo2e.HasValue ? "&amp;rol=yetkili" : "";
        var updated = E(product.UpdatedAt.ToUniversalTime().ToString("g", Text.Culture));
        var carbon = product.CarbonKgCo2e is { } value
            ? $"<div><dt>{T("carbon")}</dt><dd>{N(value)} kg CO2e</dd></div>" : "";
        return $$"""
            <!doctype html>
            <html lang="{{Text.Language}}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <title>{{E(product.ModelName)}} · {{T("title")}}</title>
            <style>
            *{box-sizing:border-box}body{margin:0;background:#f3f5f0;color:#182d29;font:16px/1.6 system-ui,sans-serif}
            main{max-width:860px;margin:48px auto;padding:32px}header{border-bottom:1px solid #cbd6cb;padding-bottom:24px}
            .eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#48604d}h1{font-size:clamp(2rem,6vw,3.5rem);line-height:1.15;margin:16px 0}
            .card{margin-top:24px;background:white;border:1px solid #d6dfd4;border-radius:20px;padding:28px}
            dl{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:0}dt{color:#53645b;font-size:14px}dd{margin:4px 0 0;font-weight:600}
            nav{display:flex;flex-wrap:wrap;gap:8px;align-items:center}nav a{display:inline-flex;align-items:center;min-height:44px;min-width:44px}nav a[aria-current="true"]{font-weight:700}dd,h1{overflow-wrap:anywhere}a{color:#225c38;text-underline-offset:4px}a:focus-visible{outline:3px solid #225c38;outline-offset:4px}
            .qr{display:flex;gap:24px;align-items:center}.qr img{width:150px;height:150px}footer{font-size:13px;color:#53645b;margin-top:24px}
            @media(max-width:560px){main{margin:0;padding:24px 18px}dl{grid-template-columns:1fr}.qr{flex-wrap:wrap}.card{padding:22px} }
            </style></head><body><main>
            <header><nav aria-label="{{T("language")}}"><a href="{{url}}?lang=tr{{languageRole}}" lang="tr" hreflang="tr" aria-current="{{(Text.IsTurkish ? "true" : "false")}}">Türkçe</a> | <a href="{{url}}?lang=en{{languageRole}}" lang="en" hreflang="en" aria-current="{{(!Text.IsTurkish ? "true" : "false")}}">English</a></nav><p class="eyebrow">Mini DPP / {{T("transparency")}}</p><h1>{{E(product.ModelName)}}</h1>
            <p>{{T("title")}} · {{T("version")}} {{product.Version.ToString(Text.Culture)}}</p></header>
            <section class="card" aria-label="{{T("information")}}"><dl>
            <div><dt>GTIN</dt><dd>{{E(product.Gtin)}}</dd></div>
            <div><dt>{{T("batch")}}</dt><dd>{{E(product.BatchNumber)}}</dd></div>
            <div><dt>{{T("composition")}}</dt><dd>{{Percent(product.Cotton, "cotton")}} · {{Percent(product.Elastane, "elastane")}}</dd></div>
            <div><dt>{{T("location")}}</dt><dd>{{E(product.Location)}}</dd></div>{{carbon}}
            </dl></section>
            <section class="card qr" aria-label="{{T("qr")}}"><img src="{{url}}/qr.png" alt="{{T("qrAlt")}}" width="150" height="150">
            <div><h2>{{T("takeWithYou")}}</h2><p>{{T("scan")}}</p>
            <a href="{{url}}/qr.png" download="{{E(product.Gtin)}}.png">{{T("download")}}</a> · <a href="{{url}}.jsonld{{role}}">{{T("jsonLd")}}</a></div></section>
            <footer>{{T("updated")}} {{updated}} UTC · {{T("demo")}}</footer>
            </main></body></html>
            """;
    }
}
