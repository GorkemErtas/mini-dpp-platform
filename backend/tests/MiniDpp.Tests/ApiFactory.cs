using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using MiniDpp.Api;
using MiniDpp.Domain;
using MiniDpp.Infrastructure;

namespace MiniDpp.Tests;

public sealed class ApiFactory(bool failOneSnapshot = false) : WebApplicationFactory<Program>
{
    public string DatabasePath { get; } = Path.Combine(Path.GetTempPath(), $"mini-dpp-test-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("AllowedHosts", "*");
        builder.ConfigureServices(services =>
        {
            var options = new DbContextOptionsBuilder<DppDbContext>()
                .UseSqlite($"Data Source={DatabasePath};Foreign Keys=True;Pooling=False");
            if (failOneSnapshot) options.AddInterceptors(new FailSnapshotInterceptor());
            services.RemoveAll<IDbContextFactory<DppDbContext>>();
            services.AddSingleton<IDbContextFactory<DppDbContext>>(new TestDbFactory(options.Options));
            services.RemoveAll<PublicUrls>();
            services.AddSingleton(new PublicUrls("https://passports.example.test"));
        });
    }

    public async Task<DppDbContext> DatabaseAsync() =>
        await Services.GetRequiredService<IDbContextFactory<DppDbContext>>().CreateDbContextAsync();

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();
        foreach (var suffix in new[] { "", "-wal", "-shm" })
            if (File.Exists(DatabasePath + suffix)) File.Delete(DatabasePath + suffix);
    }

    private sealed class TestDbFactory(DbContextOptions<DppDbContext> options) : IDbContextFactory<DppDbContext>
    {
        public DppDbContext CreateDbContext() => new(options);
    }

    private sealed class FailSnapshotInterceptor : SaveChangesInterceptor
    {
        private bool failed;
        public override ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            if (!failed && eventData.Context!.ChangeTracker.Entries<ProductRevision>()
                .Any(entry => entry.State == EntityState.Added))
            {
                failed = true;
                throw new DbUpdateException("Simulated revision storage failure.");
            }
            return ValueTask.FromResult(result);
        }
    }
}
