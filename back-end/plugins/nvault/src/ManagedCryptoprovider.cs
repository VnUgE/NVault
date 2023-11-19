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
using System.Text.Json;
using System.Collections.Generic;

using VNLib.Utils;
using VNLib.Utils.Logging;
using VNLib.Plugins;
using VNLib.Plugins.Extensions.Loading;

using NVault.Crypto.Secp256k1;

namespace NVault.Plugins.Vault
{
    [ConfigurationName("crypto")]
    internal class ManagedCryptoprovider : INostrCryptoProvider
    {
        private readonly INostrCryptoProvider _provider;

        public ManagedCryptoprovider(PluginBase plugin, IConfigScope config)
        {
            IRandomSource? random = null;

            //See if a random source is specified
            if (config.TryGetValue("lib_random", out JsonElement randomel))
            {
                bool isManaged = randomel.GetProperty("lib_type").GetString() == "managed";
                string path = randomel.GetProperty("lib_path").GetString() ?? throw new KeyNotFoundException("Missing required key 'lib_path' in 'lib_random' element");

                if (isManaged)
                {
                    //Load managed assembly, plugin will manage lifetime
                    random = plugin.CreateServiceExternal<IRandomSource>(path);
                }
                else
                {
                    //load unmanaged lib
                    random = UnmanagedRandomSource.LoadLibrary(path, System.Runtime.InteropServices.DllImportSearchPath.SafeDirectories);

                    //Register for unload to cleanup unmanaged lib
                    _ = plugin.RegisterForUnload(((UnmanagedRandomSource)random).Dispose);
                }
            }

            string nativePath = config.GetRequiredProperty("lib_crypto", p => p.GetString()!);

            //Load native library path
            _provider = NativeSecp256k1Library.LoadLibrary(nativePath, random);
            plugin.Log.Verbose("Loaded native Secp256k1 library from {path}", nativePath);
        }

        ///<inheritdoc/>
        public int GetSignatureBufferSize() => _provider.GetSignatureBufferSize();

        ///<inheritdoc/>
        public ERRNO SignMessage(ReadOnlySpan<byte> key, ReadOnlySpan<byte> digest, Span<byte> signatureBuffer) => _provider.SignMessage(key, digest, signatureBuffer);

        ///<inheritdoc/>
        public KeyBufferSizes GetKeyBufferSize() => _provider.GetKeyBufferSize();

        ///<inheritdoc/>
        public bool TryGenerateKeyPair(Span<byte> publicKey, Span<byte> privateKey) => _provider.TryGenerateKeyPair(publicKey, privateKey);

        ///<inheritdoc/>
        public bool RecoverPublicKey(ReadOnlySpan<byte> privateKey, Span<byte> pubKey) => _provider.RecoverPublicKey(privateKey, pubKey);

        ///<inheritdoc/>
        public ERRNO DecryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aseIv, ReadOnlySpan<byte> cyphterText, Span<byte> outputBuffer)
        {
            return _provider.DecryptMessage(secretKey, targetKey, aseIv, cyphterText, outputBuffer);
        }

        ///<inheritdoc/>
        public ERRNO EncryptMessage(ReadOnlySpan<byte> secretKey, ReadOnlySpan<byte> targetKey, ReadOnlySpan<byte> aesIv, ReadOnlySpan<byte> plainText, Span<byte> cipherText)
        {
            return _provider.EncryptMessage(secretKey, targetKey, aesIv, plainText, cipherText);
        }

        ///<inheritdoc/>
        public void GetRandomBytes(Span<byte> bytes)
        {
            _provider.GetRandomBytes(bytes);
        }
    }
}
