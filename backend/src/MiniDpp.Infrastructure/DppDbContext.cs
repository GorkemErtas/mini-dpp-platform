using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MiniDpp.Domain;

namespace MiniDpp.Infrastructure;

public sealed class DppDbContext(DbContextOptions<DppDbContext> options) : DbContext(options)
{
    public DbSet<ProductModel> Models => Set<ProductModel>();
    public DbSet<Batch> Batches => Set<Batch>();
    public DbSet<ProductRevision> Revisions => Set<ProductRevision>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var models = modelBuilder.Entity<ProductModel>();
        models.ToTable("Models");
        models.Property(x => x.Name).IsRequired().HasMaxLength(200);
        models.HasIndex(x => x.Name).IsUnique();

        var batches = modelBuilder.Entity<Batch>();
        batches.ToTable("Batches", table =>
        {
            table.HasCheckConstraint("CK_Batches_Gtin", "length(Gtin) = 14 AND Gtin NOT GLOB '*[^0-9]*'");
            table.HasCheckConstraint("CK_Batches_Version", "Version >= 1");
        });
        batches.HasIndex(x => x.Gtin).IsUnique();
        batches.HasIndex(x => new { x.ModelId, x.Number }).IsUnique();
        batches.HasOne(x => x.Model).WithMany(x => x.Batches).HasForeignKey(x => x.ModelId).OnDelete(DeleteBehavior.Restrict);
        batches.Property(x => x.Gtin).IsRequired().HasMaxLength(14);
        batches.Property(x => x.Number).IsRequired().HasMaxLength(200);
        batches.Property(x => x.Location).IsRequired().HasMaxLength(200);
        batches.Property(x => x.Version).IsConcurrencyToken();
        batches.Ignore(x => x.State);
        Decimal(batches.Property(x => x.Cotton));
        Decimal(batches.Property(x => x.Elastane));
        Decimal(batches.Property(x => x.Carbon));
        Utc(batches.Property(x => x.UpdatedAt));

        var revisions = modelBuilder.Entity<ProductRevision>();
        revisions.ToTable("Revisions");
        revisions.HasIndex(x => new { x.BatchId, x.Version }).IsUnique();
        revisions.HasOne<Batch>().WithMany(x => x.Revisions).HasForeignKey(x => x.BatchId).OnDelete(DeleteBehavior.Restrict);
        revisions.Property(x => x.Gtin).IsRequired().HasMaxLength(14);
        revisions.Property(x => x.ModelName).IsRequired().HasMaxLength(200);
        revisions.Property(x => x.BatchNumber).IsRequired().HasMaxLength(200);
        revisions.Property(x => x.Location).IsRequired().HasMaxLength(200);
        revisions.Ignore(x => x.State);
        Decimal(revisions.Property(x => x.Cotton));
        Decimal(revisions.Property(x => x.Elastane));
        Decimal(revisions.Property(x => x.Carbon));
        Utc(revisions.Property(x => x.ChangedAt));
    }

    private static void Decimal(PropertyBuilder<decimal> property) => property.HasConversion(
        value => value.ToString(CultureInfo.InvariantCulture),
        value => decimal.Parse(value, CultureInfo.InvariantCulture)).HasColumnType("TEXT");

    private static void Utc(PropertyBuilder<DateTime> property) => property.HasConversion(
        value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        GuardRevisions();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        GuardRevisions();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    private void GuardRevisions()
    {
        if (ChangeTracker.Entries<ProductRevision>().Any(e => e.State is EntityState.Modified or EntityState.Deleted))
            throw new InvalidOperationException("Product revisions are immutable.");
    }
}
