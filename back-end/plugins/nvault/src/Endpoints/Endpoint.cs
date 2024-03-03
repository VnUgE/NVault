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
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text.Json.Serialization;

using Microsoft.EntityFrameworkCore;

using FluentValidation;

using NVault.VaultExtensions;
using VNLib.Utils.Logging;
using VNLib.Utils.Extensions;
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
    internal sealed class Endpoint : ProtectedWebEndpoint
    {
        const string EventLogTemplate = "Method {m}, UserID {uid}, Type {tp} Payload {p}";

        private static IValidator<NostrEvent> EventValidator { get; } = NostrEvent.GetValidator();
        private static IValidator<NostrRelay> RelayValidator { get; } = NostrRelay.GetValidator();
        private static IValidator<NostrKeyMeta> KeyMetaValidator { get; } = NostrKeyMeta.GetValidator();
        private static IValidator<CreateKeyRequest> CreateKeyRequestValidator { get; } = CreateKeyRequest.GetValidator();
        private static IValidator<Nip04DecryptRequest> DecrptMessageValidator { get; } = Nip04DecryptRequest.GetValidator();
        private static IValidator<Nip04EncryptRequest> EncryptMessageValidator { get; } = Nip04EncryptRequest.GetValidator();

        private readonly INostrOperations _vault;
        private readonly NostrRelayStore _relays;
        private readonly NostrKeyMetaStore _publicKeyStore;
        private readonly NostrEventHistoryStore _eventHistoryStore;
        private readonly bool AllowDelete;
        private readonly ILogProvider? _abnoxiousLog;

        public Endpoint(PluginBase plugin, IConfigScope config)
        {
            string? path = config["path"].GetString();
            InitPathAndLog(path, plugin.Log);

            AllowDelete = config.TryGetValue("allow_delete", out JsonElement adEl) && adEl.GetBoolean();

            IAsyncLazy<DbContextOptions> options = plugin.GetContextOptionsAsync();

            _relays = new NostrRelayStore(options);
            _publicKeyStore = new NostrKeyMetaStore(options);
            _eventHistoryStore = new NostrEventHistoryStore(options);
            
            _vault = new NostrOpProvider(plugin);          

            //Check for obnoxious logging
            if (plugin.HostArgs.HasArgument("--nvault-obnoxious"))
            {
                _abnoxiousLog = plugin.Log.CreateScope("NVAULT EVENT");
            }
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

            if(entity.QueryArgs.IsArgumentSet("type", "getEvents"))
            {
                //Get the event history
                List<NostrEventEntry> events = _eventHistoryStore.ListRental.Rent();

                //Get the first page of events for the user
                await _eventHistoryStore.GetUserPageAsync(events, entity.Session.UserID, 0, 100);

                //Return all events for the user
                entity.CloseResponseJson(HttpStatusCode.OK, events);

                _eventHistoryStore.ListRental.Return(events);

                return VfReturnType.VirtualSkip;
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> PostAsync(HttpEntity entity)
        {
            ValErrWebMessage webm = new();

            //Get the operation argument
            if (entity.QueryArgs.IsArgumentSet("type", "signEvent"))
            {
                //Get the event
                NostrEvent? nEvent = await entity.GetJsonFromFileAsync<NostrEvent>();

                if(webm.Assert(nEvent != null, "Bad request"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                //Basic validate the message
                if(!EventValidator.Validate(nEvent, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                //Get the key metadata
                NostrKeyMeta? keyMeta = await _publicKeyStore.GetSingleUserRecordAsync(nEvent.KeyId, entity.Session.UserID);
                if(webm.Assert(keyMeta?.Value != null, "Key not found"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.NotFound);
                }

                //If no public key is set, use the key metadata
                if(string.IsNullOrWhiteSpace(nEvent.PublicKey))
                {
                    nEvent.PublicKey = keyMeta.Value;
                }

                //Event public key must match the key metadata
                if(webm.Assert(keyMeta.Value.Equals(nEvent.PublicKey, StringComparison.OrdinalIgnoreCase), "Key mismatch"))
                {
                    return VirtualOk(entity, webm);
                }

                _abnoxiousLog?.Information(EventLogTemplate, "POST", entity.Session.UserID[..10], "sign-event", nEvent);

                //Create user scope
                VaultUserScope scope = new(entity.Session.UserID);

                //try to sign the event
                bool result = await _vault.SignEventAsync(scope, keyMeta, nEvent, entity.EventCancellation);

                if(webm.Assert(result, "Failed to sign nostr event"))
                {
                    return VirtualOk(entity, webm);
                }

                //Create new event entry and store it
                NostrEventEntry newEvent = NostrEventEntry.FromEvent(entity.Session.UserID, nEvent);
                result = await _eventHistoryStore.CreateUserRecordAsync(newEvent, entity.Session.UserID, entity.EventCancellation);

                if (!result)
                {
                    Log.Warn("Failed to store event in history, {evid} for user {userid}", nEvent.Id, entity.Session.UserID[..8]);
                }
                
                webm.Result = nEvent;
                webm.Success = true;

                //Return the signed event
                return VirtualOk(entity, webm);
            }

            //Decryption
            if (entity.QueryArgs.IsArgumentSet("type", "decrypt"))
            {
                //Recover the decryption request
                Nip04DecryptRequest? request = await entity.GetJsonFromFileAsync<Nip04DecryptRequest>();

                if (webm.Assert(request != null, "No decryption request received"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                if (!DecrptMessageValidator.Validate(request, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                //Recover the current users key metadata
                NostrKeyMeta? key = await _publicKeyStore.GetSingleUserRecordAsync(request.KeyId!, entity.Session.UserID);

                if (webm.Assert(key != null, "Key metadata not found"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.NotFound);
                }

                _abnoxiousLog?.Information(EventLogTemplate, "POST", entity.Session.UserID[..10], "decrypt-message", request);

                VaultUserScope scope = new(entity.Session.UserID);

                //Try to decrypt the message
                webm.Result = await _vault.DecryptNoteAsync(
                    scope, 
                    key, 
                    request.OtherPubKey!, 
                    request.Ciphertext!, 
                    entity.EventCancellation
                );
                
                webm.Success = true;

                return VirtualOk(entity, webm);
            }

            //Encryption
            if (entity.QueryArgs.IsArgumentSet("type", "encrypt"))
            {
                //Recover the decryption request
                Nip04EncryptRequest? request = await entity.GetJsonFromFileAsync<Nip04EncryptRequest>();

                if (webm.Assert(request != null, "No decryption request received"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                if (!EncryptMessageValidator.Validate(request, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                //Recover the current user's key metadata
                NostrKeyMeta? key = await _publicKeyStore.GetSingleUserRecordAsync(request.KeyId!, entity.Session.UserID);

                if (webm.Assert(key != null, "Key metadata not found"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.NotFound);
                }

                _abnoxiousLog?.Information(EventLogTemplate, "POST", entity.Session.UserID[..10], "encrypt-message", request);

                VaultUserScope scope = new(entity.Session.UserID);
                try
                {
                    //Try to encrypt the message
                    webm.Result = await _vault.EncryptNoteAsync(
                        scope,
                        key,
                        request.OtherPubKey!,
                        request.PlainText!,
                        entity.EventCancellation
                    );

                    webm.Success = true;
                }
                catch (CryptographicException)
                {
                    webm.Result = "Failed to encrypt the ciphertext";
                }

                return VirtualOk(entity, webm);
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
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                //Validate 
                if (!RelayValidator.Validate(relay, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                //Cleanup relay message
                relay.CleanupFromUser();

                //Update or create the relay for the user
                if(await _relays.CreateUserRecordAsync(relay, entity.Session.UserID))
                {
                    webm.Result = "Successfully updated relay";
                    webm.Success = true;
                }
                else
                {
                    webm.Result = "Failed to update relay";
                }

                return VirtualOk(entity, webm);
            }

            //Allow updating key metdata
            if(entity.QueryArgs.IsArgumentSet("type", "identity"))
            {
                //Get the key metadata
                NostrKeyMeta? meta = await entity.GetJsonFromFileAsync<NostrKeyMeta>();

                if(webm.Assert(meta != null, "No key metadata specified"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                //Validate the key metadata
                if(!KeyMetaValidator.Validate(meta, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
                }

                meta.CleanupFromUser();

                //Get the original record
                NostrKeyMeta? original = await _publicKeyStore.GetSingleUserRecordAsync(meta.Id, entity.Session.UserID);

                if(webm.Assert(original != null, "Key metadata not found"))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.NotFound);
                }

                //Merge the metadata
                original.Merge(meta);
                
                //Update the key metadata for the user
                if(await _publicKeyStore.UpdateUserRecordAsync(original, entity.Session.UserID))
                {
                    webm.Result = "Successfully updated key metadata";
                    webm.Success = true;
                }
                else
                {
                    webm.Result = "Failed to update key metadata";
                }

                return VirtualOk(entity, webm);
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
                    return VirtualClose(entity, webm, HttpStatusCode.BadRequest);
                }

                if(!CreateKeyRequestValidator.Validate(request, webm))
                {
                    return VirtualClose(entity, webm, HttpStatusCode.UnprocessableEntity);
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
                    return VirtualOk(entity, webm);
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
                    return VirtualOk(entity, webm);
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
                return VirtualOk(entity, webm);
            }

            return VfReturnType.NotFound;
        }

        protected override async ValueTask<VfReturnType> DeleteAsync(HttpEntity entity)
        {
            ValErrWebMessage webMessage = new ();

            //common id argument
            string? id = entity.QueryArgs.GetValueOrDefault("id");

            if (entity.QueryArgs.IsArgumentSet("type", "identity"))
            {
                if (webMessage.Assert(AllowDelete, "Deleting identies are now allowed"))
                {
                    return VirtualClose(entity, webMessage, HttpStatusCode.Forbidden);
                }

                if (webMessage.Assert(id != null, "No key id specified"))
                {
                    return VirtualClose(entity, webMessage, HttpStatusCode.BadRequest);
                }

                //Get the key metadata
                NostrKeyMeta? meta = await _publicKeyStore.GetSingleUserRecordAsync(id, entity.Session.UserID);

                if (webMessage.Assert(meta != null, "Key metadata not found"))
                {
                    return VirtualClose(entity, webMessage, HttpStatusCode.NotFound);
                }

                //Delete the key from the vault
                VaultUserScope scope = new(entity.Session.UserID);

                //Delete the key from the vault
                await _vault.DeleteCredentialAsync(scope, meta, entity.EventCancellation);

                //Remove the key metadata
                await _publicKeyStore.DeleteUserRecordAsync(id, entity.Session.UserID);

                webMessage.Result = "Successfully deleted identity";
                webMessage.Success = true;
                return VirtualOk(entity, webMessage);
            }

            if(entity.QueryArgs.IsArgumentSet("type", "relay"))
            {
                if(webMessage.Assert(id != null, "No relay id specified"))
                {
                    return VirtualClose(entity, webMessage, HttpStatusCode.BadRequest);
                }

                //Delete the relay
                if(await _relays.DeleteUserRecordAsync(id, entity.Session.UserID))
                {
                    webMessage.Result = "Successfully deleted relay";
                    webMessage.Success = true;
                }
                else
                {
                    webMessage.Result = "Failed to delete relay";
                }

                return VirtualOk(entity, webMessage);
            }

            if(entity.QueryArgs.IsArgumentSet("type", "event"))
            {
                //Internal event id is required
                if(webMessage.Assert(id != null, "No event id specified"))
                {
                    return VirtualClose(entity, webMessage, HttpStatusCode.BadRequest);
                }

                //Delete the event
                if(await _eventHistoryStore.DeleteUserRecordAsync(id, entity.Session.UserID))
                {
                    webMessage.Result = "Successfully deleted event";
                    webMessage.Success = true;
                }
                else
                {
                    webMessage.Result = "Failed to delete event";
                }

                return VirtualOk(entity, webMessage);
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
 

        sealed class Nip04DecryptRequest
        {
            [JsonPropertyName("KeyId")]
            public string? KeyId { get; set; }

            [JsonPropertyName("content")]
            public string? Ciphertext { get; set; }

            [JsonPropertyName("pubkey")]
            public string? OtherPubKey { get; set; }

            public static IValidator<Nip04DecryptRequest> GetValidator()
            {
                InlineValidator<Nip04DecryptRequest> validationRules = new();

                validationRules.RuleFor(p => p.KeyId)
                    .NotEmpty()!
                    .AlphaNumericOnly()
                    .Length(1, 100);

                validationRules.RuleFor(p => p.Ciphertext)
                    .NotEmpty()
                    .Length(0, 10000)
                    //Make sure iv exists
                    .Must(ct => ct.Contains("?iv=", StringComparison.OrdinalIgnoreCase))
                    .WithMessage("iv not found in ciphertext")
                    //Check iv is not too long
                    .Must(ct => ct.AsSpan().SliceAfterParam("?iv=").Length == NostrOpProvider.IvMaxBase64EncodedSize)
                    .WithMessage("iv is not the correct size");

                //Pubpkey must be 64 hex characters
                validationRules.RuleFor(p => p.OtherPubKey)
                    .NotEmpty()
                    .Length(64)
                    .AlphaNumericOnly();

                return validationRules;
            }
        }

        sealed class Nip04EncryptRequest
        {
            [JsonPropertyName("KeyId")]
            public string? KeyId { get; set; }

            [JsonPropertyName("content")]
            public string? PlainText { get; set; }

            [JsonPropertyName("pubkey")]
            public string? OtherPubKey { get; set; }

            public static IValidator<Nip04EncryptRequest> GetValidator()
            {
                InlineValidator<Nip04EncryptRequest> validationRules = new();

                validationRules.RuleFor(p => p.KeyId)
                    .NotEmpty()!
                    .AlphaNumericOnly()
                    .Length(1, 100);

                validationRules.RuleFor(p => p.PlainText)
                    .NotEmpty()
                    .Length(0, 10000);

                //Pubpkey must be 64 hex characters
                validationRules.RuleFor(p => p.OtherPubKey)
                    .NotEmpty()
                    .Length(64)
                    .AlphaNumericOnly();

                return validationRules;
            }
        }
    }
}
