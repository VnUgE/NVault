// Copyright (C) 2024 Vaughn Nugent
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
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

using FluentValidation;

using VNLib.Plugins.Extensions.Data;
using VNLib.Plugins.Extensions.Data.Abstractions;
using VNLib.Plugins.Extensions.Validation;

namespace NVault.Plugins.Vault.Model
{    
    internal class NostrKeyMeta : DbModelBase, IUserEntity
    {
        [Key]
        [MaxLength(64)]
        public override string Id { get; set; }
        
        public override DateTime Created { get; set; }
        
        public override DateTime LastModified { get; set; }

        [JsonPropertyName("PublicKey")]
        [MaxLength(500)]
        public string? Value { get; set; }

        [JsonIgnore]
        [MaxLength(50)]
        public string? UserId { get; set; }

        [MaxLength(64)]
        public string? UserName { get; set; }

        public void CleanupFromUser()
        {
            //Forbidden fields
            Created = DateTime.MinValue; 
            LastModified = DateTime.MinValue;
            UserId = null;
            
            //User is not allowed to change the key value
            Value = null;

            //Trim up username
            UserName = UserName?.Trim();
        }

        public void Merge(NostrKeyMeta other)
        {
            ArgumentNullException.ThrowIfNull(other);

            //We only update username and key value
            UserName = other.UserName;
        }

        public static IValidator<NostrKeyMeta> GetValidator()
        {
            InlineValidator<NostrKeyMeta> val = new();

            val.RuleFor(r => r.Id)
                .NotEmpty()
                //Max id length is 64 hex characters
                .MaximumLength(64)
                //must only be hex characters
                .AlphaNumericOnly();

            val.RuleFor(r => r.UserName)
                .NotEmpty()
                .Length(1, 100)
                .IllegalCharacters();

            return val;
        }
    }
}
