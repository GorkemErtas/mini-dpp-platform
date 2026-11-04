using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MiniDpp.Application;
using MiniDpp.Domain;

namespace MiniDpp.Infrastructure;

public sealed class CsvImporter(IDbContextFactory<DppDbContext> factory, ILogger<CsvImporter> logger) : ICsvImporter
{
    private sealed record ParsedRow(int Line, string[] Values, bool Malformed);

    public async Task<ImportReport> ImportAsync(Stream stream, CancellationToken cancellationToken)
    {
        // Parse before writing so invalid encoding, headers or an oversized row count cannot partially import a file.
        var (headers, rows) = await ParseAsync(stream, cancellationToken);
        var report = new ImportReport { Total = rows.Count };
        foreach (var row in rows)
        {
            cancellationToken.ThrowIfCancellationRequested();
            if (row.Malformed || row.Values.Length != headers.Length)
            {
                report.Errors.Add(new(row.Line, [new("csv", "Malformed CSV record or incorrect number of columns.")]));
                continue;
            }
            var values = headers.Select((key, i) => (key, row.Values[i])).ToDictionary(x => x.key, x => x.Item2);
            var validation = ProductValidation.Validate(values);
            if (validation.Product is null)
            {
                report.Errors.Add(new(row.Line, validation.Errors));
                continue;
            }
            try
            {
                var result = await PersistAsync(validation.Product, cancellationToken);
                switch (result)
                {
                    case "imported": report.Imported++; break;
                    case "updated": report.Updated++; break;
                    default: report.Unchanged++; break;
                }
            }
            catch (DbUpdateException exception)
            {
                logger.LogWarning(exception, "Persistence conflict at CSV row {Row}", row.Line);
                report.Errors.Add(new(row.Line, [new("batch_no", "The model/batch identity conflicts with another GTIN, or the record changed concurrently. Retry with corrected data.")]));
            }
        }
        return report;
    }

    private static async Task<(string[] Headers, List<ParsedRow> Rows)> ParseAsync(Stream stream, CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(stream, new UTF8Encoding(false, true), detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        var malformed = false;
        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = false,
            IgnoreBlankLines = false,
            BadDataFound = _ => malformed = true,
            ExceptionMessagesContainRawData = false,
            MaxFieldSize = 4096
        };
        using var parser = new CsvParser(reader, config);
        try
        {
            if (!await parser.ReadAsync()) throw new InvalidCsvException("The CSV is empty. Include the required header row.");
            var headers = parser.Record!.Select(x => x.Trim().TrimStart('\uFEFF')).ToArray();
            if (malformed || headers.Distinct(StringComparer.Ordinal).Count() != headers.Length)
                throw new InvalidCsvException("CSV headers must be well-formed and unique.");
            var missing = ProductValidation.Columns.Except(headers, StringComparer.Ordinal).ToArray();
            if (missing.Length > 0) throw new InvalidCsvException($"Missing required columns: {string.Join(", ", missing)}.");
            var rows = new List<ParsedRow>();
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var line = parser.RawRow + 1;
                malformed = false;
                if (!await parser.ReadAsync()) break;
                var record = parser.Record!;
                if (string.IsNullOrWhiteSpace(parser.RawRecord)) continue;
                rows.Add(new(line, record, malformed));
                if (rows.Count > 10000) throw new InvalidCsvException("A CSV may contain at most 10,000 data rows.");
            }
            return (headers, rows);
        }
        catch (Exception exception) when (exception is CsvHelperException or DecoderFallbackException)
        {
            throw new InvalidCsvException("The file could not be read as a well-formed UTF-8 CSV. Check quoting, encoding and field lengths.");
        }
    }

    private async Task<string> PersistAsync(ProductState state, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var batch = await db.Batches.Include(x => x.Model).SingleOrDefaultAsync(x => x.Gtin == state.Gtin, cancellationToken);
        if (batch is not null && batch.State == state) return "unchanged";
        var result = batch is null ? "imported" : "updated";
        var model = await db.Models.SingleOrDefaultAsync(x => x.Name == state.ModelName, cancellationToken);
        if (model is null)
        {
            model = new ProductModel { Name = state.ModelName };
            db.Models.Add(model);
        }
        if (batch is null)
        {
            batch = new Batch { Gtin = state.Gtin, Number = state.BatchNumber, Location = state.Location };
            db.Batches.Add(batch);
        }
        batch.Model = model;
        batch.Number = state.BatchNumber;
        batch.Cotton = state.Cotton;
        batch.Elastane = state.Elastane;
        batch.Location = state.Location;
        batch.Carbon = state.Carbon;
        batch.Version++;
        batch.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        db.Revisions.Add(new ProductRevision(batch));
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return result;
    }
}
