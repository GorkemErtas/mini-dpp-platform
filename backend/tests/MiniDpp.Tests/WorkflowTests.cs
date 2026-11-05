using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MiniDpp.Application;
using MiniDpp.Domain;
using StbImageSharp;
using ZXing;
using ZXing.Common;

namespace MiniDpp.Tests;

public sealed class WorkflowTests : IAsyncLifetime
{
    private readonly ApiFactory factory = new();
    private HttpClient client = null!;
    private const string Gtin = "08690000000012";
    private const string Header = "gtin,model_adi,batch_no,elyaf_pamuk_yuzde,elyaf_elastan_yuzde,uretim_yeri,karbon_kg_co2e";
    private const string Row = "08690000000012,Slim Denim 501,B2027-01,98,2,Denizli,12.4";
    private static string Sample => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "samples", "urunler_duzeltilmis_test.csv"));

    public Task InitializeAsync()
    {
        client = factory.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
        return Task.CompletedTask;
    }
    public async Task DisposeAsync() { client.Dispose(); await factory.DisposeAsync(); }

    [Fact]
    public async Task Supplied_sample_has_exact_partial_success_and_persists_leading_zeros()
    {
        var report = await Import(Sample);
        Assert.Equal((5, 3, 2, 0, 0), (report.Total, report.Imported, report.Failed, report.Updated, report.Unchanged));
        Assert.Equal([4, 5], report.Errors.Select(error => error.Row));
        Assert.Contains(report.Errors[0].Errors, error => error.Field == "gtin");
        Assert.Contains(report.Errors[1].Errors, error => error.Field == "composition");
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(["08690000000012", "08690000000029", "08690000000050"],
            await db.Batches.OrderBy(x => x.Gtin).Select(x => x.Gtin).ToArrayAsync());
        Assert.Equal(3, await db.Models.CountAsync());
        Assert.Equal(3, await db.Revisions.CountAsync());
        Assert.Empty(await db.Database.GetPendingMigrationsAsync());
    }

    [Fact]
    public async Task Duplicate_imports_are_noops_and_changes_have_immutable_full_snapshots()
    {
        await Import(Sample);
        var repeat = await Import(Sample);
        Assert.Equal((0, 0, 3, 2), (repeat.Imported, repeat.Updated, repeat.Unchanged, repeat.Failed));
        var changed = await Import($"{Header}\n{Row.Replace("12.4", "14.25", StringComparison.Ordinal)}");
        Assert.Equal(1, changed.Updated);
        var noOp = await Import($"{Header}\n{Row.Replace("12.4", "14.250", StringComparison.Ordinal)}");
        Assert.Equal(1, noOp.Unchanged);
        var history = await client.GetFromJsonAsync<Passport[]>($"/api/products/{Gtin}/history?rol=yetkili");
        Assert.NotNull(history);
        Assert.Equal([2, 1], history.Select(x => x.Version));
        Assert.Equal(14.25m, history[0].CarbonKgCo2e);
        Assert.Equal(12.4m, history[1].CarbonKgCo2e);
        Assert.All(history, x => Assert.Equal(DateTimeKind.Utc, x.UpdatedAt.Kind));
        Assert.True(history[0].UpdatedAt >= history[1].UpdatedAt);
        var version1 = await client.GetFromJsonAsync<Passport>($"/api/products/{Gtin}/history/1?rol=yetkili");
        Assert.Equal(history[1], version1);
    }

    [Fact]
    public async Task Shared_model_is_one_to_many_and_recipe_update_affects_only_one_batch()
    {
        await Import($"{Header}\n{Row}\n08690000000029,Slim Denim 501,B2027-02,99,1,Bursa,11.8");
        await Import($"{Header}\n{Row.Replace(",98,2,", ",97,3,", StringComparison.Ordinal)}");
        await using var db = await factory.DatabaseAsync();
        var model = await db.Models.Include(x => x.Batches).SingleAsync();
        Assert.Equal(2, model.Batches.Count);
        Assert.Equal(97m, model.Batches.Single(x => x.Gtin == Gtin).Cotton);
        Assert.Equal(99m, model.Batches.Single(x => x.Gtin != Gtin).Cotton);
        Assert.Equal(1, model.Batches.Single(x => x.Gtin != Gtin).Version);
    }

    [Fact]
    public async Task Model_rename_reassigns_only_target_and_keeps_historical_name()
    {
        await Import($"{Header}\n{Row}\n08690000000029,Slim Denim 501,B2027-02,99,1,Bursa,11.8");
        await Import($"{Header}\n{Row.Replace("Slim Denim 501", "New Model", StringComparison.Ordinal)}");
        var history = await client.GetFromJsonAsync<Passport[]>($"/api/products/{Gtin}/history");
        Assert.Equal(["New Model", "Slim Denim 501"], history!.Select(x => x.ModelName));
        var other = await client.GetFromJsonAsync<Passport>("/api/products/08690000000029");
        Assert.Equal("Slim Denim 501", other!.ModelName);
    }

    [Fact]
    public async Task Conflicting_model_batch_identity_rejects_only_that_row()
    {
        await Import($"{Header}\n{Row}");
        var report = await Import($"{Header}\n{Row.Replace(Gtin, "08690000000029", StringComparison.Ordinal)}\n08690000000050,Mom Jean 505,B2027-05,97,3,Bursa,12.2");
        Assert.Equal((1, 1), (report.Imported, report.Failed));
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(2, await db.Batches.CountAsync());
        Assert.Equal(2, await db.Revisions.CountAsync());
    }

    [Fact]
    public async Task Snapshot_failure_rolls_back_model_and_batch_then_processes_next_row()
    {
        await using var failingFactory = new ApiFactory(failOneSnapshot: true);
        using var failingClient = failingFactory.CreateClient();
        var report = await Import($"{Header}\n{Row}\n08690000000029,Regular Denim 502,B2027-02,99,1,Denizli,11.8", failingClient);
        Assert.Equal((1, 1), (report.Failed, report.Imported));
        await using var db = await failingFactory.DatabaseAsync();
        Assert.Equal("Regular Denim 502", (await db.Models.SingleAsync()).Name);
        Assert.Equal("08690000000029", (await db.Batches.SingleAsync()).Gtin);
        Assert.Equal(1, await db.Revisions.CountAsync());
    }

    [Fact]
    public async Task Failed_update_rolls_back_new_model_and_preserves_previous_version()
    {
        await Import($"{Header}\n{Row}\n08690000000029,Other Model,B2027-02,99,1,Bursa,11.8");
        var conflict = Row.Replace("Slim Denim 501", "Other Model", StringComparison.Ordinal).Replace("B2027-01", "B2027-02", StringComparison.Ordinal);
        var report = await Import($"{Header}\n{conflict}");
        Assert.Equal(1, report.Failed);
        var passport = await client.GetFromJsonAsync<Passport>($"/api/products/{Gtin}");
        Assert.Equal(1, passport!.Version);
        Assert.Equal("Slim Denim 501", passport.ModelName);
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(2, await db.Revisions.CountAsync());
    }

    [Fact]
    public async Task Database_prevents_duplicate_gtin_and_rewriting_history()
    {
        await Import($"{Header}\n{Row}");
        await using var db = await factory.DatabaseAsync();
        var revision = await db.Revisions.SingleAsync();
        db.Entry(revision).Property(x => x.Location).CurrentValue = "Changed";
        await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        db.ChangeTracker.Clear();
        var batch = await db.Batches.SingleAsync();
        db.Batches.Add(new Batch { Gtin = Gtin, ModelId = batch.ModelId, Number = "different", Location = "Bursa", Version = 1 });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Html_jsonld_and_every_public_api_apply_same_visibility(bool authorized)
    {
        await Import($"{Header}\n{Row}");
        var role = authorized ? "?rol=yetkili" : "";
        var html = await client.GetStringAsync($"/dpp/{Gtin}{role}");
        using var response = await client.GetAsync($"/dpp/{Gtin}.jsonld{role}");
        Assert.Equal("application/ld+json", response.Content.Headers.ContentType!.MediaType);
        var json = await response.Content.ReadAsStringAsync();
        using var jsonld = JsonDocument.Parse(json);
        Assert.Equal("https://schema.org", jsonld.RootElement.GetProperty("@context").GetString());
        Assert.Equal("Product", jsonld.RootElement.GetProperty("@type").GetString());
        Assert.Equal(Gtin, jsonld.RootElement.GetProperty("gtin14").GetString());
        Assert.Equal("Slim Denim 501", jsonld.RootElement.GetProperty("name").GetString());
        foreach (var field in new[] { Gtin, "Slim Denim 501", "B2027-01", "Denizli" })
        {
            Assert.Contains(field, html);
            Assert.Contains(field, json);
        }
        Assert.Contains("98% cotton", html);
        Assert.Contains("2% elastane", html);
        var properties = jsonld.RootElement.GetProperty("additionalProperty").EnumerateArray().ToArray();
        Assert.Equal(98m, properties.Single(x => x.GetProperty("name").GetString() == "Cotton").GetProperty("value").GetDecimal());
        Assert.All(properties, property => Assert.Equal("PropertyValue", property.GetProperty("@type").GetString()));
        Assert.Equal(authorized, html.Contains("12.4", StringComparison.Ordinal));
        Assert.Equal(authorized, json.Contains("karbon_kg_co2e", StringComparison.Ordinal));
        foreach (var endpoint in new[] { "/api/products", $"/api/products/{Gtin}", $"/api/products/{Gtin}/history", $"/api/products/{Gtin}/history/1" })
        {
            var body = await client.GetStringAsync(endpoint + role);
            Assert.Equal(authorized, body.Contains("carbonKgCo2e", StringComparison.Ordinal));
            Assert.Equal(authorized, body.Contains("12.4", StringComparison.Ordinal));
        }
        Assert.Equal("no-store", response.Headers.CacheControl!.ToString());
    }

    [Theory]
    [InlineData("YETKILI")]
    [InlineData("admin")]
    [InlineData("")]
    public async Task Unrecognized_role_does_not_reveal_carbon(string role)
    {
        await Import($"{Header}\n{Row}");
        var body = await client.GetStringAsync($"/api/products/{Gtin}?rol={role}");
        Assert.DoesNotContain("carbon", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Qr_is_decodable_png_with_configured_url_ignoring_host_and_role()
    {
        await Import($"{Header}\n{Row}");
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/dpp/{Gtin}/qr.png?rol=yetkili");
        request.Headers.Host = "attacker.example";
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        Assert.Equal("image/png", response.Content.Headers.ContentType!.MediaType);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }, bytes[..8]);
        var image = ImageResult.FromMemory(bytes, ColorComponents.RedGreenBlueAlpha);
        var luminance = new RGBLuminanceSource(image.Data, image.Width, image.Height, RGBLuminanceSource.BitmapFormat.RGBA32);
        var decoded = new BarcodeReaderGeneric { Options = new DecodingOptions { TryHarder = true, PossibleFormats = [BarcodeFormat.QR_CODE], PureBarcode = true } }.Decode(luminance);
        Assert.NotNull(decoded);
        Assert.Equal($"https://passports.example.test/dpp/{Gtin}", decoded.Text);
    }

    [Theory]
    [InlineData("/dpp/00000000000000")]
    [InlineData("/dpp/00000000000000.jsonld")]
    [InlineData("/dpp/00000000000000/qr.png")]
    [InlineData("/api/products/00000000000000")]
    [InlineData("/api/products/00000000000000/history")]
    [InlineData("/api/products/00000000000000/history/1")]
    public async Task Unknown_gtin_is_404(string route) => Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(route)).StatusCode);

    [Fact]
    public async Task Missing_version_is_404_and_search_filters_products()
    {
        await Import(Sample);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/products/{Gtin}/history/99")).StatusCode);
        var matches = await client.GetFromJsonAsync<Passport[]>("/api/products?q=mom");
        Assert.Equal("08690000000050", Assert.Single(matches!).Gtin);
        Assert.Empty((await client.GetFromJsonAsync<Passport[]>("/api/products?q=missing"))!);
    }

    [Fact]
    public async Task Utf8_bom_quoted_commas_blank_lines_and_physical_rows_work()
    {
        var csv = $"\uFEFF{Header}\r\n\r\n08690000000012,\"Denim, Özel\",B1,98.1,1.9,İzmir,0\r\n\r\n,Invalid,B2,99,1,Bursa,1\r\n";
        var report = await Import(csv);
        Assert.Equal((2, 1, 1), (report.Total, report.Imported, report.Failed));
        Assert.Equal(5, report.Errors[0].Row);
        var passport = await client.GetFromJsonAsync<Passport>($"/api/products/{Gtin}");
        Assert.Equal("Denim, Özel", passport!.ModelName);
        Assert.Equal("İzmir", passport.Location);
    }

    [Fact]
    public async Task Multiline_fields_use_starting_physical_line_numbers()
    {
        var report = await Import($"{Header}\n08690000000012,\"Denim\nSpecial\",B1,98,2,Denizli,1\n,Missing,B2,98,2,Bursa,2");
        Assert.Equal(1, report.Imported);
        Assert.Equal(4, Assert.Single(report.Errors).Row);
    }

    [Fact]
    public async Task Malformed_row_does_not_prevent_subsequent_valid_record()
    {
        var report = await Import($"{Header}\n08690000000029,Bad\"quote,B2,98,2,Bursa,1\n{Row}");
        Assert.Equal((1, 1), (report.Failed, report.Imported));
        Assert.Equal(2, report.Errors[0].Row);
    }

    [Fact]
    public async Task Wrong_column_count_rejected_and_valid_rows_continue()
    {
        var report = await Import($"{Header}\nonly,two\n{Row}");
        Assert.Equal((1, 1), (report.Failed, report.Imported));
    }

    [Theory]
    [InlineData("gtin,model_adi\n08690000000012,Denim")]
    [InlineData("gtin,gtin,model_adi,batch_no,elyaf_pamuk_yuzde,elyaf_elastan_yuzde,uretim_yeri,karbon_kg_co2e")]
    public async Task Missing_or_duplicate_headers_return_actionable_400_without_writes(string csv)
    {
        using var form = Form(Encoding.UTF8.GetBytes(csv));
        var response = await client.PostAsync("/api/import/csv", form);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType!.MediaType);
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(0, await db.Models.CountAsync());
    }

    [Fact]
    public async Task Bad_encoding_after_valid_row_does_not_partially_import()
    {
        var bytes = Encoding.UTF8.GetBytes($"{Header}\n{Row}\n").Concat(new byte[] { 0xff, 0xfe }).ToArray();
        using var form = Form(bytes);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/import/csv", form)).StatusCode);
        await using var db = await factory.DatabaseAsync();
        Assert.Equal(0, await db.Batches.CountAsync());
    }

    [Fact]
    public async Task Upload_problems_are_400_or_413()
    {
        using var missing = new MultipartFormDataContent();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/import/csv", missing)).StatusCode);
        using var empty = Form([]);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/import/csv", empty)).StatusCode);
        using var wrongExtension = Form(Encoding.UTF8.GetBytes(Sample), "products.txt");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsync("/api/import/csv", wrongExtension)).StatusCode);
        using var oversized = Form(new byte[2 * 1024 * 1024 + 1]);
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, (await client.PostAsync("/api/import/csv", oversized)).StatusCode);
        using var plain = new StringContent(Sample);
        Assert.Equal(HttpStatusCode.UnsupportedMediaType, (await client.PostAsync("/api/import/csv", plain)).StatusCode);
    }

    [Fact]
    public async Task Html_escapes_imported_content_and_does_not_embed_raw_data()
    {
        await Import($"{Header}\n{Row.Replace("Slim Denim 501", "<script>alert(1)</script>", StringComparison.Ordinal)}");
        var html = await client.GetStringAsync($"/dpp/{Gtin}");
        Assert.Contains("&lt;script&gt;", html);
        Assert.DoesNotContain("<script>", html);
        Assert.DoesNotContain("12.4", html);
    }

    [Fact]
    public async Task Openapi_documents_routes_and_cors_restricts_origins()
    {
        var swagger = await client.GetStringAsync("/swagger/v1/swagger.json");
        Assert.Contains("/api/import/csv", swagger);
        Assert.Contains("/dpp/{gtin}.jsonld", swagger);
        using var allowed = new HttpRequestMessage(HttpMethod.Get, "/api/products");
        allowed.Headers.Add("Origin", "http://localhost:5173");
        var allowedResponse = await client.SendAsync(allowed);
        Assert.Equal("http://localhost:5173", Assert.Single(allowedResponse.Headers.GetValues("Access-Control-Allow-Origin")));
        using var denied = new HttpRequestMessage(HttpMethod.Get, "/api/products");
        denied.Headers.Add("Origin", "https://untrusted.example");
        Assert.False((await client.SendAsync(denied)).Headers.Contains("Access-Control-Allow-Origin"));
    }

    private async Task<ImportReport> Import(string csv, HttpClient? customClient = null)
    {
        using var form = Form(Encoding.UTF8.GetBytes(csv));
        using var response = await (customClient ?? client).PostAsync("/api/import/csv", form);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<ImportReport>())!;
    }

    private static MultipartFormDataContent Form(byte[] bytes, string filename = "products.csv")
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes), "file", filename);
        return form;
    }
}
