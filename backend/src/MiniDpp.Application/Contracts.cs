using System.Text.Json.Serialization;
using MiniDpp.Domain;

namespace MiniDpp.Application;

public sealed record Passport(string Gtin, string ModelName, string BatchNumber,
    decimal Cotton, decimal Elastane, string Location, int Version, DateTime UpdatedAt,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] decimal? CarbonKgCo2e);

public static class PassportPresenter
{
    public static bool IsAuthorizedDemo(string? role) => string.Equals(role, "yetkili", StringComparison.Ordinal);

    public static Passport Present(ProductState state, int version, DateTime timestamp, bool authorized) =>
        new(state.Gtin, state.ModelName, state.BatchNumber, state.Cotton, state.Elastane,
            state.Location, version, timestamp, authorized ? state.Carbon : null);
}

public sealed record ImportError(int Row, IReadOnlyList<FieldError> Errors);
public sealed class ImportReport
{
    public int Total { get; set; }
    public int Imported { get; set; }
    public int Updated { get; set; }
    public int Unchanged { get; set; }
    public int Failed => Errors.Count;
    public List<ImportError> Errors { get; init; } = [];
}

public sealed class InvalidCsvException(string message) : Exception(message);

public interface ICsvImporter
{
    Task<ImportReport> ImportAsync(Stream stream, CancellationToken cancellationToken);
}

public interface IProductReader
{
    Task<IReadOnlyList<Passport>> ListAsync(string? search, bool authorized, CancellationToken cancellationToken);
    Task<Passport?> FindAsync(string gtin, bool authorized, CancellationToken cancellationToken);
    Task<IReadOnlyList<Passport>?> HistoryAsync(string gtin, bool authorized, CancellationToken cancellationToken);
}
