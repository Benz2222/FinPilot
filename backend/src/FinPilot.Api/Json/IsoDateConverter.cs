using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FinPilot.Api.Json;

public sealed class IsoDateConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String || !DateOnly.TryParseExact(reader.GetString(),
                "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date) ||
            date == DateOnly.MinValue || date == DateOnly.MaxValue)
            throw new JsonException("Dates must be valid YYYY-MM-DD strings.");
        return date;
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options) =>
        writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
}
