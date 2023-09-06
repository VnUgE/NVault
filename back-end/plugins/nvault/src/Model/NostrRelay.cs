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

using System;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations;

using FluentValidation;

using Microsoft.EntityFrameworkCore;

using VNLib.Plugins.Extensions.Data;
using VNLib.Plugins.Extensions.Data.Abstractions;
using VNLib.Plugins.Extensions.Validation;

namespace NVault.Plugins.Vault.Model
{
    [Index(nameof(Url))]
    internal class NostrRelay : DbModelBase, IUserEntity
    {
        [Key]
        [MaxLength(50)]
        [JsonPropertyName("id")]
        public override string Id { get; set; }
        public override DateTime Created { get; set; }
        public override DateTime LastModified { get; set; }

        [JsonPropertyName("url")]
        [MaxLength(200)]
        public string Url { get; set; }

        [JsonPropertyName("flags")]
        public NostrRelayFlags Flags { get; set; }

        [JsonIgnore]
        [MaxLength(50)]
        public string UserId { get; set; }

        public void CleanupFromUser()
        {
            //Forbidden fields
            Created = DateTime.MinValue; 
            LastModified = DateTime.MinValue;
            UserId = null;

            //trim up url
            Url = Url?.Trim();
        }

        public static IValidator<NostrRelay> GetValidator()
        {
            InlineValidator<NostrRelay> val = new();

            //Must specify a relay id
            val.RuleFor(r => r.Id)
                .NotEmpty()
                //Must be length 64 hex characters
                .MaximumLength(50)
                //must only be hex characters
                .AlphaNumericOnly();

            val.RuleFor(r => r.Url)
                .NotEmpty()
                .Length(5, 200)
                .IllegalCharacters();

            //Must set read/write flag, may be 0 for none/not allowed
            val.RuleFor(r => r.Flags)
                .NotEmpty();

            return val;
        }
    }
}
