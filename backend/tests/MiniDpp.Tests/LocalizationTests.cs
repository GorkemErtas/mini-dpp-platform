using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MiniDpp.Application;
using MiniDpp.Domain;

namespace MiniDpp.Tests;

public sealed class LocalizationTests
{
    private const string Gtin = "08690000000012";
    private const string Header = "gtin,model_adi,batch_no,elyaf_pamuk_yuzde,elyaf_elastan_yuzde,uretim_yeri,karbon_kg_co2e";
    private const string Row = "08690000000012,Slim Denim 501,B2027-01,98,2,Denizli,12.4";

    private static async Task<HttpResponseMessage> Upload(HttpClient client, string csv)
    {
        using var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(Encoding.UTF8.GetBytes(csv)), "file", "products.csv");
        return await client.PostAsync("/api/import/csv", form);
    }

    [Theory]
    [InlineData(null, "tr")]
    [InlineData("de-DE", "tr")]
    [InlineData("tr-TR", "tr")]
    [InlineData("en-US", "en")]
    [InlineData("de;q=1, en-GB;q=0.8, tr;q=0.5", "en")]
    [InlineData("en;q=0.5, tr;q=0.9", "tr")]
    public async Task Language_negotiation_localizes_404_without_changing_contract(string? header, string language)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        if (header is not null) client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(header);
        using var response = await client.GetAsync("/api/products/missing?lang=en");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(language == "tr" ? "Ürün bulunamadı" : "Product not found", body.GetProperty("title").GetString());
        Assert.Equal(404, body.GetProperty("status").GetInt32());
        Assert.Equal(language, Assert.Single(response.Content.Headers.ContentLanguage));
    }

    [Theory]
    [InlineData("tr")]
    [InlineData("en")]
    public async Task Sample_import_and_reimport_preserve_rules_rows_and_snapshots_in_both_languages(string language)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        var csv = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "samples", "urunler_duzeltilmis_test.csv"));
        using var response = await Upload(client, csv);
        response.EnsureSuccessStatusCode();
        var report = (await response.Content.ReadFromJsonAsync<ImportReport>())!;
        Assert.Equal((5, 3, 0, 0, 2), (report.Total, report.Imported, report.Updated, report.Unchanged, report.Failed));
        Assert.Equal([4, 5], report.Errors.Select(error => error.Row));
        Assert.Equal("gtin", Assert.Single(report.Errors[0].Errors).Field);
        Assert.Equal(language == "tr"
            ? "GTIN, geçerli bir GS1 kontrol basamağı içeren tam 14 ASCII rakamından oluşmalıdır."
            : "GTIN must contain exactly 14 ASCII digits with a valid GS1 check digit.", report.Errors[0].Errors[0].Message);
        Assert.Equal(language == "tr" ? "Pamuk ve elastan yüzdelerinin toplamı 100 olmalıdır."
            : "Cotton and elastane percentages must sum to 100.", report.Errors[1].Errors[0].Message);
        var before = await client.GetStringAsync($"/api/products/{Gtin}/history?rol=yetkili");
        client.DefaultRequestHeaders.AcceptLanguage.Clear();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language == "tr" ? "en" : "tr");
        using var repeatResponse = await Upload(client, csv);
        var repeat = (await repeatResponse.Content.ReadFromJsonAsync<ImportReport>())!;
        Assert.Equal((0, 0, 3, 2), (repeat.Imported, repeat.Updated, repeat.Unchanged, repeat.Failed));
        Assert.Equal(before, await client.GetStringAsync($"/api/products/{Gtin}/history?rol=yetkili"));
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(3, await db.Batches.CountAsync());
        Assert.Equal(3, await db.Revisions.CountAsync());
        Assert.Equal(12.4m, (await db.Batches.SingleAsync(batch => batch.Gtin == Gtin)).Carbon);
    }

    [Theory]
    [InlineData("tr", "Geçersiz CSV", "Eksik zorunlu sütunlar: ")]
    [InlineData("en", "Invalid CSV", "Missing required columns: ")]
    public async Task File_errors_localize_prose_and_preserve_column_identifiers(string language, string title, string prefix)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        using var response = await Upload(client, "gtin\n08690000000012");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(title, problem.GetProperty("title").GetString());
        Assert.Equal(prefix + "model_adi, batch_no, elyaf_pamuk_yuzde, elyaf_elastan_yuzde, uretim_yeri, karbon_kg_co2e.",
            problem.GetProperty("detail").GetString());
        using var plain = await client.PostAsync("/api/import/csv", new StringContent("not multipart"));
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, plain.StatusCode);
        var mediaProblem = await plain.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(language == "tr" ? "Desteklenmeyen içerik türü" : "Unsupported Media Type", mediaProblem.GetProperty("title").GetString());
    }

    [Theory]
    [InlineData("tr", false)]
    [InlineData("tr", true)]
    [InlineData("en", false)]
    [InlineData("en", true)]
    public async Task Direct_html_localizes_labels_formatting_and_links_while_preserving_visibility(string language, bool authorized)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var imported = await Upload(client, $"{Header}\n{Row}");
        imported.EnsureSuccessStatusCode();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language == "tr" ? "en" : "tr");
        var role = authorized ? "&rol=yetkili" : "";
        using var response = await client.GetAsync($"/dpp/{Gtin}?lang={language}{role}");
        var html = WebUtility.HtmlDecode(await response.Content.ReadAsStringAsync());
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains($"<html lang=\"{language}\">", html);
        Assert.Contains(language == "tr" ? "Dijital Ürün Pasaportu" : "Digital Product Passport", html);
        Assert.Contains(language == "tr" ? "%98 pamuk" : "98% cotton", html);
        Assert.Contains(language == "tr" ? "Üretim Yeri" : "Manufacturing location", html);
        Assert.Contains($"?lang=tr{role}", html);
        Assert.Contains($"?lang=en{role}", html);
        Assert.Equal(authorized, html.Contains(language == "tr" ? "12,4 kg CO2e" : "12.4 kg CO2e", StringComparison.Ordinal));
        Assert.Contains($"src=\"https://passports.example.test/dpp/{Gtin}/qr.png\"", html);
        var product = (await client.GetFromJsonAsync<Passport>($"/api/products/{Gtin}"))!;
        var culture = CultureInfo.GetCultureInfo(language == "tr" ? "tr-TR" : "en-US");
        Assert.Contains(product.UpdatedAt.ToUniversalTime().ToString("g", culture) + " UTC", html);
        Assert.Null(product.CarbonKgCo2e);
    }

    [Fact]
    public async Task Direct_html_honors_header_and_Turkish_fallback_without_query()
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var imported = await Upload(client, $"{Header}\n{Row}");
        Assert.Contains("<html lang=\"tr\">", await client.GetStringAsync($"/dpp/{Gtin}"));
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en-US");
        Assert.Contains("<html lang=\"en\">", await client.GetStringAsync($"/dpp/{Gtin}"));
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Language_changes_never_change_jsonld_or_API_data(bool authorized)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        using var imported = await Upload(client, $"{Header}\n{Row}");
        var role = authorized ? "?rol=yetkili" : "";
        foreach (var route in new[] { $"/api/products{role}", $"/api/products/{Gtin}{role}",
            $"/api/products/{Gtin}/history{role}", $"/api/products/{Gtin}/history/1{role}", $"/dpp/{Gtin}.jsonld{role}" })
        {
            client.DefaultRequestHeaders.AcceptLanguage.Clear();
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("tr");
            var turkish = await client.GetStringAsync(route);
            client.DefaultRequestHeaders.AcceptLanguage.Clear();
            client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
            Assert.Equal(turkish, await client.GetStringAsync(route));
            Assert.Equal(authorized, turkish.Contains("12.4", StringComparison.Ordinal));
        }
        var trQr = await client.GetByteArrayAsync($"/dpp/{Gtin}/qr.png?lang=tr&rol=yetkili");
        var enQr = await client.GetByteArrayAsync($"/dpp/{Gtin}/qr.png?lang=en");
        Assert.Equal(trQr, enQr);
    }

    [Theory]
    [InlineData("tr")]
    [InlineData("en")]
    public async Task Every_domain_validation_rule_has_a_localized_safe_message(string language)
    {
        await using var factory = new ApiFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        var invalidRows = new[]
        {
            ",,,bad,bad,,bad", $"{Gtin},{new string('x', 201)},B1,-1,101,Denizli,-1",
            $"{Gtin},Denim,B1,98,1,Denizli,12.4"
        };
        using var response = await Upload(client, Header + "\n" + string.Join('\n', invalidRows));
        var report = (await response.Content.ReadFromJsonAsync<ImportReport>())!;
        Assert.Equal(3, report.Failed);
        Assert.Equal(0, report.Imported);
        var expected = new[]
        {
            "GTIN must contain exactly 14 ASCII digits with a valid GS1 check digit.", "This field is required.",
            "Enter a decimal number using a dot, without grouping separators.", "Use at most 200 characters.",
            "Cotton must be between 0 and 100.", "Elastane must be between 0 and 100.",
            "Carbon footprint must be nonnegative.", "Cotton and elastane percentages must sum to 100."
        };
        var actual = report.Errors.SelectMany(row => row.Errors).Select(error => error.Message).Distinct().ToArray();
        Assert.Equal(expected.Length, actual.Length);
        if (language == "en") Assert.Equal(expected.Order(), actual.Order());
        else Assert.All(actual, message =>
        {
            Assert.DoesNotContain(message, expected);
            Assert.DoesNotContain("İstek tamamlanamadı.", message);
        });
        Assert.All(report.Errors.SelectMany(row => row.Errors), error => Assert.Contains(error.Field,
            ProductValidation.Columns.Concat(["composition"])));
    }

    [Theory]
    [InlineData("tr", "İstek tamamlanamadı.", "İsteği yeniden deneyin.")]
    [InlineData("en", "The request could not be completed.", "Retry the request.")]
    public async Task Unexpected_failures_localize_safe_errors_without_exposing_exception_text(string language, string title, string detail)
    {
        await using var factory = new ApiFactory();
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<ICsvImporter>();
            services.AddSingleton<ICsvImporter>(new FailingImporter());
        }));
        using var client = host.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd(language);
        using var response = await Upload(client, $"{Header}\n{Row}");
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(title, body.GetProperty("title").GetString());
        Assert.StartsWith(detail, body.GetProperty("detail").GetString());
        Assert.DoesNotContain("private database path", body.ToString());
    }

    private sealed class FailingImporter : ICsvImporter
    {
        public Task<ImportReport> ImportAsync(Stream stream, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("private database path");
    }
}
