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
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;

using Microsoft.EntityFrameworkCore;

using FluentValidation;

using NVault.VaultExtensions;

using VNLib.Plugins;
using VNLib.Plugins.Essentials;
using VNLib.Plugins.Essentials.Endpoints;
using VNLib.Plugins.Essentials.Extensions;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Validation;
using VNLib.Plugins.Extensions.Loading.Sql;
using VNLib.Plugins.Extensions.Data.Extensions;

using NVault.Plugins.Vault.Model;

namespace NVault.Plugins.Vault.Endpoints
{

    [ConfigurationName("endpoint")]
    internal class Endpoint : ProtectedWebEndpoint
    {
        private static IValidator<NostrEvent> EventValidator { get; } = NostrEvent.GetValidator();
        private static IValidator<NostrRelay> RelayValidator { get; } = NostrRelay.GetValidator();
        private static IValidator<NostrKeyMeta> KeyMetaValidator { get; } = NostrKeyMeta.GetValidator();
        private static IValidator<CreateKeyRequest> CreateKeyRequestValidator { get; } = CreateKeyRequest.GetValidator();

        private readonly INostrOperations _vault;
        private readonly NostrRelayStore _relays;
        private readonly NostrKeyMetaStore _publicKeyStore;
        private readonly bool AllowDelete;

        public Endpoint(PluginBase plugin, IConfigScope config)
        {
            string? path = config["path"].GetString();
            InitPathAndLog(path, plugin.Log);

            AllowDelete = config.TryGetValue("allow_delete", out JsonElement adEl) && adEl.GetBoolean();


            DbContextOptions options = plugin.GetContextOptions();

            _relays = new NostrRelayStore(options);
            _publicKeyStore = new NostrKeyMetaStore(options);
            _vault = new NostrOpProvider(plugin);
        }


        protected override async ValueTask<VfReturnType> GetAsync(HttpEntity entity)
        {
            //Check the operation flag
            if(entity.QueryArgs.IsArgumentSet("type", "getRelays"))
            {
                //Get all relays
                List<NostrRelay> relays = _relays.ListRental.Rent();

                await _relays.GetUserPageAsync(relays, entity.Session.UserID, 0, 100);

                //Return all relays for the user
                entity.CloseResponseJson(HttpStatusCode.OK, relays);

                _relays.ListRental.Return(relays);

                return VfReturnType.VirtualSkip;
            }

            //Get pubkey
            if (entity.QueryArgs.IsArgumentSet("type", "getKeys"))
            {
                List<NostrKeyMeta> keys = _publicKeyStore.ListRental.Rent();

                //Get the first public key for the user 
                await _publicKeyStore.GetUserPageAsync(keys, entity.Session.UserID, 0, 100);

                //Return all keys for the user
                entity.CloseResponseJson(HttpStatusCode.OK, keys);

                _publicKeyStore.ListRental.Return(keys);

                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> PostAsync(HttpEntity entity)
        {            

            //Get the operation argument
            if(entity.QueryArgs.IsArgumentSet("type", "signEvent"))
            {
                ValErrWebMessage webm = new();

                //Get the event
                NostrEvent? ev = await entity.GetJsonFromFileAsync<NostrEvent>();

                if(webm.Assert(ev != null, "Bad request"))
                {
                    entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                    return VfReturnType.VirtualSkip;
                }

                //Basic validate the message
                if(!EventValidator.Validate(ev, webm))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //Get the key metadata
                NostrKeyMeta? keyMeta = await _publicKeyStore.GetSingleUserRecordAsync(ev.KeyId, entity.Session.UserID);
                if(webm.Assert(keyMeta != null, "Key not found"))
                {
                    entity.CloseResponseJson(HttpStatusCode.NotFound, webm);
                    return VfReturnType.VirtualSkip;
                }

                //If no public key is set, use the key metadata
                if(string.IsNullOrWhiteSpace(ev.PublicKey))
                {
                    ev.PublicKey = keyMeta.Value;
                }

                //Event public key must match the key metadata
                if(webm.Assert(keyMeta.Value.Equals(ev.PublicKey, StringComparison.OrdinalIgnoreCase), "Key mismatch"))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //Create user scope
                VaultUserScope scope = new(entity.Session.UserID);

                //try to sign the event
                bool result = await _vault.SignEventAsync(scope, keyMeta, ev, entity.EventCancellation);

                if(webm.Assert(result, "Failed to sign nostr event"))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                webm.Result = ev;
                webm.Success = true;

                //Return the signed event
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> PatchAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Check for relay update
            if (entity.QueryArgs.IsArgumentSet("type", "relay"))
            {
                //Get the new relay item
                NostrRelay? relay = await entity.GetJsonFromFileAsync<NostrRelay>();

                if(webm.Assert(relay != null, "No relay specified"))
                {
                    entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                    return VfReturnType.VirtualSkip;
                }

                //Validate 
                if (!RelayValidator.Validate(relay, webm))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //Cleanup relay message
                relay.CleanupFromUser();

                //Update or create the relay for the user
                if(await _relays.CreateUserRecordAsync(relay, entity.Session.UserID))
                {
                    webm.Result = "Successfully updated relay";
                    webm.Success = true;
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                webm.Result = "Failed to update relay";
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            //Allow updating key metdata
            if(entity.QueryArgs.IsArgumentSet("type", "identity"))
            {
                //Get the key metadata
                NostrKeyMeta? meta = await entity.GetJsonFromFileAsync<NostrKeyMeta>();

                if(webm.Assert(meta != null, "No key metadata specified"))
                {
                    entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                    return VfReturnType.VirtualSkip;
                }

                //Validate the key metadata
                if(!KeyMetaValidator.Validate(meta, webm))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                meta.CleanupFromUser();

                //Get the original record
                NostrKeyMeta? original = await _publicKeyStore.GetSingleUserRecordAsync(meta.Id, entity.Session.UserID);

                if(webm.Assert(original != null, "Key metadata not found"))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //Merge the metadata
                original.Merge(meta);
                
                //Update the key metadata for the user
                if(await _publicKeyStore.UpdateUserRecordAsync(original, entity.Session.UserID))
                {
                    webm.Result = "Successfully updated key metadata";
                    webm.Success = true;
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                webm.Result = "Failed to update key metadata";
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> PutAsync(HttpEntity entity)
        {
            //Allow creating a new identity
            if(entity.QueryArgs.IsArgumentSet("type", "identity"))
            {
                ValErrWebMessage webm = new();

                CreateKeyRequest? request = await entity.GetJsonFromFileAsync<CreateKeyRequest>();

                if(webm.Assert(request != null, "Invalid key request"))
                {
                    entity.CloseResponseJson(HttpStatusCode.BadRequest, webm);
                    return VfReturnType.VirtualSkip;
                }

                if(!CreateKeyRequestValidator.Validate(request, webm))
                {
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //try to create the record for the user first
                NostrKeyMeta newKey = new()
                {
                    UserId = entity.Session.UserID,
                    UserName = request.UserName,
                    //Create temporary key
                    Value = Guid.NewGuid().ToString("n")
                };

                //Create the key metadata record before we generate the keypair
                if(!await _publicKeyStore.CreateUserRecordAsync(newKey, entity.Session.UserID))
                {
                    //Failed to create key metadata record
                    webm.Result = "Failed to create key";
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                //Create new user scope
                VaultUserScope scope = new(entity.Session.UserID);

                bool result;

                if (string.IsNullOrWhiteSpace(request.ExistingKey))
                {
                    //Create a new keypair/identity for the user
                    result = await _vault.CreateCredentialAsync(scope, newKey, entity.EventCancellation);
                }
                else
                {
                    //From exising key
                    result = await _vault.CreateFromExistingAsync(scope, newKey, request.ExistingKey, entity.EventCancellation);
                }

                if (result == false)
                {
                    //Delete the meta entry from the store
                    await _publicKeyStore.DeleteUserRecordAsync(newKey.Id, entity.Session.UserID);

                    webm.Result = "Failed to create new identity";
                    entity.CloseResponse(webm);
                    return VfReturnType.VirtualSkip;
                }

                /*
                 * Update the key now that the vault has updated the entity.
                 * 
                 * We dont care if this fails because the key is already created, it will
                 * just be empty, which is fine, the user can update/delete it later.
                 */
                await _publicKeyStore.UpdateUserRecordAsync(newKey, entity.Session.UserID);

                //Store the new key
                webm.Result = newKey;
                webm.Success = true;

                //Return the new key info
                entity.CloseResponse(webm);
                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
        {
            ValErrWebMessage webMessage = new ();

            if(entity.QueryArgs.IsArgumentSet("type", "identity"))
            {
                if (webMessage.Assert(AllowDelete, "Deleting identies are now allowed"))
                {
                    entity.CloseResponseJson(HttpStatusCode.Forbidden, webMessage);
                    return VfReturnType.VirtualSkip;
                }

                if (!entity.QueryArgs.TryGetNonEmptyValue("key_id", out string? keyId))
                {
                    webMessage.Result = "No key id specified";
                    entity.CloseResponseJson(HttpStatusCode.BadRequest, webMessage);
                    return VfReturnType.VirtualSkip;
                }

                //Get the key metadata
                NostrKeyMeta? meta = await _publicKeyStore.GetSingleUserRecordAsync(keyId, entity.Session.UserID);

                if (webMessage.Assert(meta != null, "Key metadata not found"))
                {
                    entity.CloseResponseJson(HttpStatusCode.NotFound, webMessage);
                    return VfReturnType.VirtualSkip;
                }

                //Delete the key from the vault
                VaultUserScope scope = new(entity.Session.UserID);

                //Delete the key from the vault
                await _vault.DeleteCredentialAsync(scope, meta, entity.EventCancellation);

                //Remove the key metadata
                await _publicKeyStore.DeleteUserRecordAsync(keyId, entity.Session.UserID);

                webMessage.Result = "Successfully deleted identity";
                webMessage.Success = true;
                entity.CloseResponseJson(HttpStatusCode.OK, webMessage);
                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        sealed class CreateKeyRequest
        {
            public string? UserName { get; set; }

            public string? ExistingKey { get; set; }

            public static IValidator<CreateKeyRequest> GetValidator()
            {
                InlineValidator<CreateKeyRequest> val = new();

                val.RuleFor(r => r.UserName)
                    .NotEmpty()
                    .Length(1, 100)
                    .IllegalCharacters();

                //If a user-key is specified, it must be 64 characters long hexadecimal
                val.When(p => !string.IsNullOrWhiteSpace(p.ExistingKey), () =>
                {
                    val.RuleFor(r => r.ExistingKey)
                       .Length(64)
                       .AlphaNumericOnly();
                });

                return val;
            }
        }
    }
}
