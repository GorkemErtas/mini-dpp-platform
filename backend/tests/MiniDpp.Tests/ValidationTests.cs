using MiniDpp.Api;
using MiniDpp.Domain;

namespace MiniDpp.Tests;

public sealed class ValidationTests
{
    [Theory]
    [InlineData("08690000000012", true)]
    [InlineData("08690000000029", true)]
    [InlineData("08690000000050", true)]
    [InlineData("08690000000043", true)]
    [InlineData("08690000000013", false)]
    [InlineData("8690000000012", false)]
    [InlineData("0869000000001A", false)]
    [InlineData("０８６９００００００００１２", false)]
    [InlineData("", false)]
    public void Gtin_uses_ascii_digits_length_and_gs1_mod10(string value, bool expected) =>
        Assert.Equal(expected, ProductValidation.IsValidGtin(value));

    [Theory]
    [InlineData("0", "100")]
    [InlineData("100", "0")]
    [InlineData("98.1", "1.9")]
    [InlineData("0.0000000000000000000000000001", "99.9999999999999999999999999999")]
    public void Percentage_boundaries_and_exact_decimals_are_valid(string cotton, string elastane)
    {
        var values = Values();
        values["elyaf_pamuk_yuzde"] = cotton;
        values["elyaf_elastan_yuzde"] = elastane;
        Assert.Empty(ProductValidation.Validate(values).Errors);
    }

    [Theory]
    [InlineData("gtin", "")]
    [InlineData("model_adi", "  ")]
    [InlineData("batch_no", "\t")]
    [InlineData("uretim_yeri", "")]
    [InlineData("elyaf_pamuk_yuzde", "-1")]
    [InlineData("elyaf_elastan_yuzde", "101")]
    [InlineData("elyaf_pamuk_yuzde", "abc")]
    [InlineData("elyaf_elastan_yuzde", "NaN")]
    [InlineData("karbon_kg_co2e", "-0.1")]
    [InlineData("karbon_kg_co2e", "12,4")]
    [InlineData("karbon_kg_co2e", "1e3")]
    [InlineData("elyaf_pamuk_yuzde", "79228162514264337593543950335")]
    public void Invalid_fields_have_specific_errors(string field, string value)
    {
        var values = Values();
        values[field] = value;
        var result = ProductValidation.Validate(values);
        Assert.Null(result.Product);
        Assert.Contains(result.Errors, error => error.Field == field);
    }

    [Fact]
    public void All_useful_errors_are_collected_without_echoing_input()
    {
        var values = Values();
        values["gtin"] = "sensitive-invalid-value";
        values["model_adi"] = " ";
        values["elyaf_elastan_yuzde"] = "3";
        values["karbon_kg_co2e"] = "-2";
        var result = ProductValidation.Validate(values);
        Assert.Equal(4, result.Errors.Count);
        Assert.DoesNotContain(result.Errors, error => error.Message.Contains("sensitive-invalid-value", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("https://user:password@example.com")]
    [InlineData("https://example.com?evil=1")]
    [InlineData("/relative")]
    public void Public_base_url_is_validated(string url) => Assert.Throws<ArgumentException>(() => new PublicUrls(url));

    [Fact]
    public void Public_base_url_preserves_configured_prefix() =>
        Assert.Equal("https://example.com/passports/dpp/08690000000012",
            new PublicUrls("https://example.com/passports/").Passport("08690000000012"));

    private static Dictionary<string, string> Values() => new()
    {
        ["gtin"] = "08690000000012",
        ["model_adi"] = "Slim Denim 501",
        ["batch_no"] = "B2027-01",
        ["elyaf_pamuk_yuzde"] = "98",
        ["elyaf_elastan_yuzde"] = "2",
        ["uretim_yeri"] = "Denizli",
        ["karbon_kg_co2e"] = "12.4"
    };
}
