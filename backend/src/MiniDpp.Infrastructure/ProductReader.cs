using Microsoft.EntityFrameworkCore;
using MiniDpp.Application;

namespace MiniDpp.Infrastructure;

public sealed class ProductReader(IDbContextFactory<DppDbContext> factory) : IProductReader
{
    public async Task<IReadOnlyList<Passport>> ListAsync(string? search, bool authorized, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var query = db.Batches.AsNoTracking().Include(x => x.Model).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var text = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Gtin.Contains(text) || x.Model.Name.ToLower().Contains(text)
                || x.Number.ToLower().Contains(text) || x.Location.ToLower().Contains(text));
        }
        var batches = await query.OrderBy(x => x.Model.Name).ThenBy(x => x.Gtin).ToListAsync(cancellationToken);
        return batches.Select(x => PassportPresenter.Present(x.State, x.Version, x.UpdatedAt, authorized)).ToList();
    }

    public async Task<Passport?> FindAsync(string gtin, bool authorized, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        var batch = await db.Batches.AsNoTracking().Include(x => x.Model).SingleOrDefaultAsync(x => x.Gtin == gtin, cancellationToken);
        return batch is null ? null : PassportPresenter.Present(batch.State, batch.Version, batch.UpdatedAt, authorized);
    }

    public async Task<IReadOnlyList<Passport>?> HistoryAsync(string gtin, bool authorized, CancellationToken cancellationToken)
    {
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        if (!await db.Batches.AnyAsync(x => x.Gtin == gtin, cancellationToken)) return null;
        var revisions = await db.Revisions.AsNoTracking().Where(x => x.Gtin == gtin)
            .OrderByDescending(x => x.Version).ToListAsync(cancellationToken);
        return revisions.Select(x => PassportPresenter.Present(x.State, x.Version, x.ChangedAt, authorized)).ToList();
    }
}
