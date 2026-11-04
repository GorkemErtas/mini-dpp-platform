using System.Globalization;

namespace MiniDpp.Domain;

public sealed record FieldError(string Field, string Message);
public sealed record ValidationResult(ProductState? Product, IReadOnlyList<FieldError> Errors);

public static class ProductValidation
{
    public static readonly string[] Columns = ["gtin", "model_adi", "batch_no",
        "elyaf_pamuk_yuzde", "elyaf_elastan_yuzde", "uretim_yeri", "karbon_kg_co2e"];

    public static bool IsValidGtin(string value)
    {
        if (value.Length != 14 || value.Any(c => c is < '0' or > '9')) return false;
        var sum = 0;
        for (var i = 0; i < 13; i++) sum += (value[i] - '0') * (i % 2 == 0 ? 3 : 1);
        return (10 - sum % 10) % 10 == value[13] - '0';
    }

    public static ValidationResult Validate(IReadOnlyDictionary<string, string> values)
    {
        var errors = new List<FieldError>();
        string Read(string key) => values.GetValueOrDefault(key, "").Trim();
        var gtin = Read("gtin");
        if (!IsValidGtin(gtin)) errors.Add(new("gtin", "GTIN must contain exactly 14 ASCII digits with a valid GS1 check digit."));
        foreach (var key in new[] { "model_adi", "batch_no", "uretim_yeri" })
        {
            if (string.IsNullOrWhiteSpace(Read(key))) errors.Add(new(key, "This field is required."));
            else if (Read(key).Length > 200) errors.Add(new(key, "Use at most 200 characters."));
        }

        bool Number(string key, out decimal value)
        {
            // A dot is the decimal separator; grouping, exponent notation and comma decimals are rejected.
            if (decimal.TryParse(Read(key), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out value)) return true;
            errors.Add(new(key, "Enter a decimal number using a dot, without grouping separators."));
            return false;
        }

        var validCotton = Number("elyaf_pamuk_yuzde", out var cotton);
        var validElastane = Number("elyaf_elastan_yuzde", out var elastane);
        var validCarbon = Number("karbon_kg_co2e", out var carbon);
        var cottonInRange = validCotton && cotton is >= 0 and <= 100;
        var elastaneInRange = validElastane && elastane is >= 0 and <= 100;
        if (validCotton && !cottonInRange) errors.Add(new("elyaf_pamuk_yuzde", "Cotton must be between 0 and 100."));
        if (validElastane && !elastaneInRange) errors.Add(new("elyaf_elastan_yuzde", "Elastane must be between 0 and 100."));
        if (cottonInRange && elastaneInRange && cotton + elastane != 100m)
            errors.Add(new("composition", "Cotton and elastane percentages must sum to 100."));
        if (validCarbon && carbon < 0) errors.Add(new("karbon_kg_co2e", "Carbon footprint must be nonnegative."));
        return new(errors.Count == 0 ? new(gtin, Read("model_adi"), Read("batch_no"),
            cotton, elastane, Read("uretim_yeri"), carbon) : null, errors);
    }
}
