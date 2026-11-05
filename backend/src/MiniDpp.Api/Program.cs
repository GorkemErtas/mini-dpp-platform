using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using MiniDpp.Api;
using MiniDpp.Application;
using MiniDpp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
{
    if (context.ProblemDetails.Title is { } title) context.ProblemDetails.Title = Text.Localize(title);
    if (context.ProblemDetails.Detail is { } detail) context.ProblemDetails.Detail = Text.Localize(detail);
});
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    options.SetDefaultCulture("tr").AddSupportedCultures("tr", "en").AddSupportedUICultures("tr", "en");
    options.ApplyCurrentCultureToResponseHeaders = true;
    options.RequestCultureProviders =
    [
        new CustomRequestCultureProvider(context =>
        {
            var language = context.Request.Query["lang"].ToString();
            return Task.FromResult<ProviderCultureResult?>(context.Request.Path.StartsWithSegments("/dpp") && language is "tr" or "en"
                ? new ProviderCultureResult(language) : null);
        }),
        new AcceptLanguageHeaderRequestCultureProvider()
    ];
});
builder.Services.AddExceptionHandler<SafeExceptionHandler>();
builder.Services.Configure<FormOptions>(options => options.MultipartBodyLengthLimit = UploadEndpoint.MaxFileBytes + 65536);
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = UploadEndpoint.MaxFileBytes + 65536);
builder.Services.AddDbContextFactory<DppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Dpp") ?? "Data Source=mini-dpp.db;Foreign Keys=True"));
builder.Services.AddScoped<ICsvImporter, CsvImporter>();
builder.Services.AddScoped<IProductReader, ProductReader>();
builder.Services.AddSingleton(new PublicUrls(builder.Configuration["PublicBaseUrl"] ?? "http://localhost:5173"));
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.WithOrigins(builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ?? ["http://localhost:5173"])
        .WithMethods("GET", "POST").AllowAnyHeader()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.SwaggerDoc("v1", new()
{
    Title = "Mini DPP API",
    Version = "v1",
    Description = "CSV product passports. rol=yetkili is a demonstration visibility switch, not authorization."
}));

var app = builder.Build();
app.UseRequestLocalization();
app.UseExceptionHandler();
app.UseStatusCodePages(async context =>
    await Results.Problem(statusCode: context.HttpContext.Response.StatusCode).ExecuteAsync(context.HttpContext));
app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'";
    await next(context);
});
app.UseCors();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    // Swagger UI has its own script/style requirements; leave the strict passport policy off this dev route.
    app.UseWhen(context => context.Request.Path.StartsWithSegments("/swagger"), branch =>
        branch.Use(async (context, next) =>
        {
            context.Response.Headers.Remove("Content-Security-Policy");
            await next(context);
        }));
    app.UseSwaggerUI();
}

app.MapPost("/api/import/csv", UploadEndpoint.UploadAsync)
    .Accepts<UploadForm>("multipart/form-data")
    .Produces<ImportReport>().ProducesProblem(400).ProducesProblem(413).ProducesProblem(415)
    .WithTags("Import")
    .WithSummary("Import up to 2 MiB / 10,000 UTF-8 CSV rows independently");

app.MapGet("/api/products", async (string? q, string? rol, IProductReader products, CancellationToken ct) =>
    Results.Ok(await products.ListAsync(q, PassportPresenter.IsAuthorizedDemo(rol), ct)))
    .Produces<IReadOnlyList<Passport>>().WithTags("Products")
    .WithSummary("Search passports; carbon is omitted unless rol=yetkili");

app.MapGet("/api/products/{gtin}", async (string gtin, string? rol, IProductReader products, CancellationToken ct) =>
    await products.FindAsync(gtin, PassportPresenter.IsAuthorizedDemo(rol), ct) is { } product
        ? Results.Ok(product) : Results.Problem(statusCode: 404, title: "Product not found"))
    .Produces<Passport>().ProducesProblem(404).WithTags("Products")
    .WithSummary("Read a product passport");

app.MapGet("/api/products/{gtin}/history", async (string gtin, string? rol, IProductReader products, CancellationToken ct) =>
    await products.HistoryAsync(gtin, PassportPresenter.IsAuthorizedDemo(rol), ct) is { } history
        ? Results.Ok(history) : Results.Problem(statusCode: 404, title: "Product not found"))
    .Produces<IReadOnlyList<Passport>>().ProducesProblem(404).WithTags("History")
    .WithSummary("Read immutable snapshots, newest first, filtered by demo role");

app.MapGet("/api/products/{gtin}/history/{version:int}", async (string gtin, int version, string? rol, IProductReader products, CancellationToken ct) =>
{
    var history = await products.HistoryAsync(gtin, PassportPresenter.IsAuthorizedDemo(rol), ct);
    return history?.SingleOrDefault(x => x.Version == version) is { } snapshot
        ? Results.Ok(snapshot) : Results.Problem(statusCode: 404, title: "Product version not found");
}).Produces<Passport>().ProducesProblem(404).WithTags("History")
    .WithSummary("Read one immutable product version");

app.MapGet("/dpp/{gtin}.jsonld", async (string gtin, string? rol, IProductReader products, PublicUrls urls, CancellationToken ct) =>
    await products.FindAsync(gtin, PassportPresenter.IsAuthorizedDemo(rol), ct) is { } product
        ? Results.Json(PassportOutputs.JsonLd(product, urls), contentType: "application/ld+json")
        : Results.Problem(statusCode: 404, title: "Product not found"))
    .WithSummary("Schema.org Product JSON-LD; same visibility rules as HTML");

app.MapGet("/dpp/{gtin}/qr.png", async (string gtin, IProductReader products, PublicUrls urls, CancellationToken ct) =>
    await products.FindAsync(gtin, false, ct) is not null
        ? Results.File(PassportOutputs.Qr(urls.Passport(gtin)), "image/png")
        : Results.Problem(statusCode: 404, title: "Product not found"))
    .WithSummary("PNG QR encoding the configured public consumer passport URL");

app.MapGet("/dpp/{gtin}", async (string gtin, string? rol, IProductReader products, PublicUrls urls, CancellationToken ct) =>
    await products.FindAsync(gtin, PassportPresenter.IsAuthorizedDemo(rol), ct) is { } product
        ? Results.Content(PassportOutputs.Html(product, urls), "text/html; charset=utf-8")
        : Results.Problem(statusCode: 404, title: "Product not found"));

await using (var scope = app.Services.CreateAsyncScope())
{
    var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<DppDbContext>>();
    await using var db = await factory.CreateDbContextAsync();
    await db.Database.MigrateAsync();
}

app.Run();

public partial class Program;
