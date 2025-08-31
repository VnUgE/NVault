// Copyright (C) 2025 Vaughn Nugent
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
using System.Runtime.InteropServices;

using VNLib.Utils;
using VNLib.Utils.Memory;
using VNLib.Utils.Logging;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;
using VNLib.Plugins.Extensions.Loading.Configuration;

using VNLib.Utils.Cryptography.Noscrypt.Random;

namespace NVault.Plugins.Vault
{
    [ConfigurationName("crypto")]
    internal class ManagedCryptoprovider : INostrCryptoProvider, IDisposable
    {
        private readonly INostrCryptoProvider _provider;

        public ManagedCryptoprovider(PluginBase plugin, IConfigScope config)
        {
            ProviderConfigJson configJson = config.DeserialzeAndValidate<ProviderConfigJson>();

            //Attempt to load a user's custom assembly if specified
            if (!string.IsNullOrWhiteSpace(configJson.CryptoAssembly))
            {
                //Load managed assembly, plugin will manage lifetime
                _provider = plugin.CreateServiceExternal<INostrCryptoProvider>(configJson.CryptoAssembly);
                plugin.Log.Verbose("Loaded managed crypto provider from {path}", configJson.CryptoAssembly);
            }
            else
            {
                IRandomSource? random = null;

                //See if a random source is specified
                if (configJson.LibRandom is not null)
                {
                    switch (configJson.LibRandom.LibType)
                    {
                        case "managed":
                            //Load managed assembly, plugin will manage lifetime
                            random = plugin.CreateServiceExternal<IRandomSource>(configJson.LibRandom.LibPath);
                            break;

                        case "native":
                            //load unmanaged lib
                            random = UnmanagedRandomSource.LoadLibrary(configJson.LibRandom.LibPath, DllImportSearchPath.SafeDirectories);
                            //Register for unload to cleanup unmanaged lib
                            _ = plugin.RegisterForUnload(((UnmanagedRandomSource)random).Dispose);
                            break;

                        default:
                            plugin.Log.Warn("Unknown random source type {type}, falling back to system default", configJson.LibRandom.LibType);
                            break;
                    }
                }

                //Load native library path
                _provider = NoscryptProvider.LoadLibrary(configJson.LibCrypto, random, MemoryUtil.Shared);
                plugin.Log.Verbose("Loaded native Noscrypt library from {path}", configJson.LibCrypto);
            }
        }

        ///<inheritdoc/>
        public int GetSignatureBufferSize() => _provider.GetSignatureBufferSize();

        ///<inheritdoc/>
        public ERRNO SignData(ReadOnlySpan<byte> key, ReadOnlySpan<byte> digest, Span<byte> signatureBuffer)
            => _provider.SignData(key, digest, signatureBuffer);

        ///<inheritdoc/>
        public KeyBufferSizes GetKeyBufferSize() => _provider.GetKeyBufferSize();

        ///<inheritdoc/>
        public bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey)
            => _provider.TryGenerateKeyPair(publicKey, privateKey);

        ///<inheritdoc/>
        public bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey)
            => _provider.RecoverPublicKey(privateKey, pubKey);

        ///<inheritdoc/>
        public INostrCipher GetMessageCipher(NostrCipherVersion version, bool isEncrypting)
            => _provider.GetMessageCipher(version, isEncrypting);

        ///<inheritdoc/>
        public void GetRandomBytes(Span<byte> bytes)
            => _provider.GetRandomBytes(bytes);

        public void Dispose()
        {
            //Dont leak the library
            if (_provider is IDisposable noscrypt)
            {
                noscrypt.Dispose();
            }
        }

        private sealed class ProviderConfigJson : IOnConfigValidation
        {
            [JsonPropertyName("lib_random")]
            public LibRandomConfigJson? LibRandom { get; init; }

            [JsonPropertyName("lib_crypto")]
            public string LibCrypto { get; init; } = "noscrypt";

            [JsonPropertyName("custom_asm_path")]
            public string? CryptoAssembly { get; init; }

            public void OnValidate()
            {
                //If a custom assembly is not specified, the lib_crypto must be specified
                if (!string.IsNullOrWhiteSpace(CryptoAssembly))
                {
                    Validate.NotNull(LibCrypto, "lib_crypto must be specified");
                }

                if (LibRandom is not null)
                {
                    Validate.NotNull(LibRandom.LibPath, "If lib_random is delcared you must specify lib_path");
                    Validate.NotNull(LibRandom.LibType, "If lib_random is declared you must specify lib_type");
                }
            }
        }

        private sealed class LibRandomConfigJson
        {
            [JsonPropertyName("lib_type")]
            public string LibType { get; init; } = "managed";

            [JsonPropertyName("lib_path")]
            public string LibPath { get; init; } = string.Empty;
        }
    }
}
