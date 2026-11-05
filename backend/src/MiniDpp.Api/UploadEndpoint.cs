using Microsoft.AspNetCore.Diagnostics;
using MiniDpp.Application;

namespace MiniDpp.Api;

public sealed class UploadForm
{
    public IFormFile? File { get; set; }
}

public static class UploadEndpoint
{
    public const long MaxFileBytes = 2 * 1024 * 1024;

    public static async Task<IResult> UploadAsync(HttpRequest request, ICsvImporter importer, CancellationToken ct)
    {
        if (!request.HasFormContentType)
            return Results.Problem(statusCode: 400, title: "Upload a CSV as multipart/form-data using the file field.");
        try
        {
            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file");
            if (file is null || file.Length == 0)
                return Results.Problem(statusCode: 400, title: "Choose a nonempty CSV file using the file field.");
            if (file.Length > MaxFileBytes)
                return Results.Problem(statusCode: 413, title: "The CSV file exceeds the 2 MiB limit.");
            if (!string.Equals(Path.GetExtension(file.FileName), ".csv", StringComparison.OrdinalIgnoreCase))
                return Results.Problem(statusCode: 400, title: "Only .csv files are accepted.");
            await using var stream = file.OpenReadStream();
            return Results.Ok(Text.Localize(await importer.ImportAsync(stream, ct)));
        }
        catch (InvalidCsvException exception)
        {
            return Results.Problem(statusCode: 400, title: "Invalid CSV", detail: exception.Message);
        }
        catch (InvalidDataException)
        {
            return Results.Problem(statusCode: 400, title: "Invalid multipart upload", detail: "Check the multipart boundary and the 2 MiB file limit.");
        }
    }
}

public sealed class SafeExceptionHandler(ILogger<SafeExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var status = exception is BadHttpRequestException badRequest ? badRequest.StatusCode : 500;
        logger.LogError(exception, "Request failed with status {Status}; trace {TraceId}", status, context.TraceIdentifier);
        await Results.Problem(statusCode: status,
            title: status == 413 ? "The upload exceeds the request size limit." : "The request could not be completed.",
            detail: "Retry the request. Completed CSV rows may already be saved; repeating the import is safe.")
            .ExecuteAsync(context);
        return true;
    }
}
