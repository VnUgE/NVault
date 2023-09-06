// Copyright (C) 2023 Vaughn Nugent
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

using System.Text.Json.Serialization;

using FluentValidation;

using VNLib.Plugins.Extensions.Validation;


namespace NVault.Plugins.Vault.Model
{
    internal sealed class NostrEvent
    {
        public const int MAX_CONTENT_LENGTH = 16 * 1024;

        [JsonPropertyName("KeyId")]
        public string? KeyId { get; set; }

        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("pubkey")]
        public string? PublicKey { get; set; }

        [JsonPropertyName("created_at")]
        public long? Timestamp { get; set; }

        [JsonPropertyName("kind")]
        public NostrMessageKind? MessageKind { get; set; }

        [JsonPropertyName("content")]
        public string? Content { get; set; }

        [JsonPropertyName("sig")]
        public string? Signature { get; set; }

        [JsonPropertyName("tags")]
        public string[]?[]? Tags { get; set; }

        public static IValidator<NostrEvent> GetValidator()
        {
            InlineValidator<NostrEvent> val = new();

            //Event id should be empty, we will generate it while computing the hash
            val.RuleFor(ev => ev.Id)
               //ids are 32 bytes hex encoded
               .Length(64)
               .AlphaNumericOnly();

            //No signature set
            val.RuleFor(ev => ev.Signature)
                .Empty();

            //If pubkey is defined, must set a 64 byte hex encoded string
            val.RuleFor(ev => ev.PublicKey!)
                .AlphaNumericOnly()
                .When(ev => ev.PublicKey != null)
                .Length(64);

            val.RuleFor(ev => ev.Content)
                .Length(0, MAX_CONTENT_LENGTH);

            val.RuleFor(ev => ev.Content)
                //Content must be specifed when kind is a text note
                .NotEmpty()
                .When(ev => ev.MessageKind == NostrMessageKind.TextNote);

            //Must have a key identity
            val.RuleFor(ev => ev.KeyId)
                .NotEmpty()
                .Length(12, 64)
                .AlphaNumericOnly();

            return val;
        }
    }
}