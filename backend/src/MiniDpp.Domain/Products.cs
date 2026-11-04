namespace MiniDpp.Domain;

public sealed class ProductModel
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public List<Batch> Batches { get; set; } = [];
}

public sealed class Batch
{
    public int Id { get; set; }
    public required string Gtin { get; set; }
    public int ModelId { get; set; }
    public ProductModel Model { get; set; } = null!;
    public required string Number { get; set; }
    public decimal Cotton { get; set; }
    public decimal Elastane { get; set; }
    public required string Location { get; set; }
    public decimal Carbon { get; set; }
    public int Version { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<ProductRevision> Revisions { get; set; } = [];

    public ProductState State => new(Gtin, Model.Name, Number, Cotton, Elastane, Location, Carbon);
}

// Append-only at the persistence boundary. Snapshots never depend on mutable navigations.
public sealed class ProductRevision
{
    public int Id { get; private set; }
    public int BatchId { get; private set; }
    public int Version { get; private set; }
    public DateTime ChangedAt { get; private set; }
    public string Gtin { get; private set; } = "";
    public string ModelName { get; private set; } = "";
    public string BatchNumber { get; private set; } = "";
    public decimal Cotton { get; private set; }
    public decimal Elastane { get; private set; }
    public string Location { get; private set; } = "";
    public decimal Carbon { get; private set; }

    private ProductRevision() { }

    public ProductRevision(Batch batch)
    {
        BatchId = batch.Id;
        Version = batch.Version;
        ChangedAt = batch.UpdatedAt;
        Gtin = batch.Gtin;
        ModelName = batch.Model.Name;
        BatchNumber = batch.Number;
        Cotton = batch.Cotton;
        Elastane = batch.Elastane;
        Location = batch.Location;
        Carbon = batch.Carbon;
    }

    public ProductState State => new(Gtin, ModelName, BatchNumber, Cotton, Elastane, Location, Carbon);
}

public sealed record ProductState(string Gtin, string ModelName, string BatchNumber,
    decimal Cotton, decimal Elastane, string Location, decimal Carbon);
