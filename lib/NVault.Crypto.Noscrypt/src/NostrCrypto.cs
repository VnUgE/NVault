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
using System.Runtime.CompilerServices;
using System.Xml;

using VNLib.Utils;

using NCResult = System.Int64;

namespace NVault.Crypto.Noscrypt
{

    /// <summary>
    /// A default implementation of the <see cref="INostrCrypto"/> interface
    /// </summary>
    /// <param name="context">The initialized library context</param>
    public unsafe class NostrCrypto(NCContext context, bool ownsContext) : VnDisposeable, INostrCrypto
    {
        /// <summary>
        /// Gets the underlying library context.
        /// </summary>
        public NCContext Context => context;

        private ref readonly FunctionTable Functions => ref context.Library.Functions;

        ///<inheritdoc/>
        public void Decrypt(
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce, 
            ref readonly byte cipherText, 
            ref byte plainText, 
            uint size
        )
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();

            NCCryptoData data = default;
            data.dataSize = size;

            //Copy nonce to struct memory buffer
            Unsafe.CopyBlock(
                ref Unsafe.AsRef<byte>(data.nonce), 
                in nonce, 
                LibNoscrypt.NC_ENCRYPTION_NONCE_SIZE
            );           

            fixed (NCSecretKey* pSecKey = &secretKey)
            fixed (NCPublicKey* pPubKey = &publicKey)
            fixed (byte* pCipherText = &cipherText, pTextPtr = &plainText)
            {
                //Set input data to the cipher text to decrypt and the output data to the plaintext buffer
                data.inputData = pCipherText;
                data.outputData = pTextPtr;

                NCResult result = Functions.NCDecrypt.Invoke(libCtx, pSecKey, pPubKey, &data);
                NCUtil.CheckResult<FunctionTable.NCDecryptDelegate>(result, true);
            }
        }

        ///<inheritdoc/>
        public void Encrypt(
            ref readonly NCSecretKey secretKey,
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce, 
            ref readonly byte plainText, 
            ref byte cipherText, 
            uint size,
            ref byte hmackKeyOut32
        )
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();

            NCCryptoData data = default;
            data.dataSize = size;

            //Copy nonce to struct memory buffer           
            Unsafe.CopyBlock(
                ref Unsafe.AsRef<byte>(data.nonce), 
                in nonce, 
                LibNoscrypt.NC_ENCRYPTION_NONCE_SIZE
            );

            fixed (NCSecretKey* pSecKey = &secretKey)
            fixed (NCPublicKey* pPubKey = &publicKey)
            fixed (byte* pCipherText = &cipherText, pTextPtr = &plainText, pHmacKeyOut = &hmackKeyOut32)
            {
                //Set input data to the plaintext to encrypt and the output data to the cipher text buffer
                data.inputData = pTextPtr;
                data.outputData = pCipherText;

                NCResult result = Functions.NCEncrypt.Invoke(libCtx, pSecKey, pPubKey, pHmacKeyOut, &data);
                NCUtil.CheckResult<FunctionTable.NCEncryptDelegate>(result, true);
            }
        }

        ///<inheritdoc/>
        public void GetPublicKey(ref readonly NCSecretKey secretKey, ref NCPublicKey publicKey)
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();

            fixed(NCSecretKey* pSecKey = &secretKey)
            fixed(NCPublicKey* pPubKey = &publicKey)
            {
                NCResult result = Functions.NCGetPublicKey.Invoke(libCtx, pSecKey, pPubKey);
                NCUtil.CheckResult<FunctionTable.NCGetPublicKeyDelegate>(result, true);
            }
        }

        ///<inheritdoc/>
        public void SignData(
            ref readonly NCSecretKey secretKey, 
            ref readonly byte random32, 
            ref readonly byte data, 
            nint dataSize, 
            ref byte sig64
        )
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();

            fixed (NCSecretKey* pSecKey = &secretKey)
            fixed(byte* pData = &data, pSig = &sig64, pRandom = &random32)
            {
                NCResult result = Functions.NCSignData.Invoke(libCtx, pSecKey, pRandom, pData, dataSize, pSig);
                NCUtil.CheckResult<FunctionTable.NCSignDataDelegate>(result, true);
            }
        }

        ///<inheritdoc/>
        public bool ValidateSecretKey(ref readonly NCSecretKey secretKey)
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();

            fixed (NCSecretKey* pSecKey = &secretKey)
            {
                /*
                 * Validate should return a result of 1 if the secret key is valid
                 * or a 0 if it is not.
                 */
                NCResult result = Functions.NCValidateSecretKey.Invoke(libCtx, pSecKey);
                NCUtil.CheckResult<FunctionTable.NCValidateSecretKeyDelegate>(result, false);

                //Result should be 1 if the secret key is valid
                return result == 1;
            }
        }

        ///<inheritdoc/>
        public bool VerifyData(
            ref readonly NCPublicKey pubKey, 
            ref readonly byte data, 
            nint dataSize, 
            ref byte sig64
        )
        {
            Check();

            IntPtr libCtx = context.DangerousGetHandle();
            
            fixed(NCPublicKey* pPubKey = &pubKey)
            fixed (byte* pData = &data, pSig = &sig64)
            {
                NCResult result = Functions.NCVerifyData.Invoke(libCtx, pPubKey, pData, dataSize, pSig);
                NCUtil.CheckResult<FunctionTable.NCVerifyDataDelegate>(result, false);

                return result == LibNoscrypt.NC_SUCCESS;
            }
        }

        ///<inheritdoc/>
        public bool VerifyMac(
            ref readonly NCSecretKey secretKey, 
            ref readonly NCPublicKey publicKey, 
            ref readonly byte nonce32, 
            ref readonly byte mac32, 
            ref readonly byte payload, 
            nint payloadSize
        )
        {
            Check();

            //Check pointers we need to use
            if(Unsafe.IsNullRef(in nonce32))
            {
                throw new ArgumentNullException(nameof(nonce32));
            }

            if(Unsafe.IsNullRef(in mac32))
            {
                throw new ArgumentNullException(nameof(mac32));
            }

            if(Unsafe.IsNullRef(in payload))
            {
                throw new ArgumentNullException(nameof(payload));
            }

            IntPtr libCtx = context.DangerousGetHandle();

            NCMacVerifyArgs args = new()
            {
                payloadSize = payloadSize,
            };

            //Copy nonce to struct memory buffer
            Unsafe.CopyBlock(
                ref Unsafe.AsRef<byte>(args.nonce), 
                in nonce32, 
                LibNoscrypt.NC_ENCRYPTION_NONCE_SIZE
            );

            //Copy mac to struct memory buffer
            Unsafe.CopyBlock(
                ref Unsafe.AsRef<byte>(args.mac), 
                in mac32, 
                LibNoscrypt.NC_ENCRYPTION_MAC_SIZE
            );

            fixed(NCSecretKey* pSecKey = &secretKey)
            fixed(NCPublicKey* pPubKey = &publicKey)
            fixed (byte* pPayload = &payload)
            {
                args.payload = pPayload;

                //Exec and bypass failure
                NCResult result = Functions.NCVerifyMac.Invoke(libCtx, pSecKey, pPubKey, &args);
                NCUtil.CheckResult<FunctionTable.NCVerifyMacDelegate>(result, false);

                //Result should be success if the hmac is valid
                return result == LibNoscrypt.NC_SUCCESS;
            }
        }

      

        ///<inheritdoc/>
        protected override void Free()
        {
            if(ownsContext)
            {
                context.Dispose();
            }
        }
    }
}
