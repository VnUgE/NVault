using Microsoft.VisualStudio.TestTools.UnitTesting;

using System;
using System.Buffers.Binary;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;

using VNLib.Hashing;
using VNLib.Utils.Memory;

namespace NVault.Crypto.Noscrypt.Tests
{
    [TestClass()]
    public class LibNoscryptTests : IDisposable
    {
        
        const string NoscryptLibWinDebug = @"../../../../../../../noscrypt/out/build/x64-debug/Debug/noscrypt.dll";


        //Keys generated using npx noskey package
        const string TestPrivateKeyHex = "98c642360e7163a66cee5d9a842b252345b6f3f3e21bd3b7635d5e6c20c7ea36";
        const string TestPublicKeyHex = "0db15182c4ad3418b4fbab75304be7ade9cfa430a21c1c5320c9298f54ea5406";

        const string TestPrivateKeyHex2 = "3032cb8da355f9e72c9a94bbabae80ca99d3a38de1aed094b432a9fe3432e1f2";
        const string TestPublicKeyHex2 = "421181660af5d39eb95e48a0a66c41ae393ba94ffeca94703ef81afbed724e5a";

        const string Nip44VectorTestFile = "nip44.vectors.json";

#nullable disable
        private LibNoscrypt _testLib;
        private JsonDocument _testVectors;
#nullable enable

        [TestInitialize]
        public void Initialize()
        {
            _testLib = LibNoscrypt.Load(NoscryptLibWinDebug);
            _testVectors = JsonDocument.Parse(File.ReadAllText(Nip44VectorTestFile));
        }


        [TestMethod()]
        public void InitializeTest()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);

            using LibNoscrypt library = LibNoscrypt.Load(NoscryptLibWinDebug);

            //Init new context and interface
            NCContext context = library.Initialize(MemoryUtil.Shared, seed);
           
            using NostrCrypto crypto = new(context, true);
        }

        [TestMethod()]
        public void ValidateSecretKeyTest()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);
            ReadOnlySpan<byte> secretKey = RandomHash.GetRandomBytes(32);
            Span<byte> publicKey = stackalloc byte[32];

            using NostrCrypto crypto = _testLib.InitializeCrypto(MemoryUtil.Shared, seed);

            //validate the secret key
            Assert.IsTrue(crypto.ValidateSecretKey(in NCUtil.AsSecretKey(secretKey)));

            //Generate the public key
            crypto.GetPublicKey(
                in NCUtil.AsSecretKey(secretKey), 
                ref NCUtil.AsPublicKey(publicKey)
            );           

            //Make sure the does not contain all zeros
            Assert.IsTrue(publicKey.ToArray().Any(b => b != 0));
        }

        [TestMethod()]
        public void TestGetPublicKey()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);

            using NostrCrypto crypto = _testLib.InitializeCrypto(MemoryUtil.Shared, seed);

            //Test known key 1
            TestKnownKeys(
                crypto,
                Convert.FromHexString(TestPrivateKeyHex),
                Convert.FromHexString(TestPublicKeyHex)
            );

            //Test known key 2
            TestKnownKeys(
                crypto,
                Convert.FromHexString(TestPrivateKeyHex2),
                Convert.FromHexString(TestPublicKeyHex2)
            );


            static void TestKnownKeys(NostrCrypto lib, ReadOnlySpan<byte> knownSec, ReadOnlySpan<byte> kownPub)
            {
                NCPublicKey pubKey;

                //Invoke test function
                lib.GetPublicKey(
                    in NCUtil.AsSecretKey(knownSec),
                    ref pubKey
                );

                //Make sure known key matches the generated key
                Assert.IsTrue(pubKey.AsSpan().SequenceEqual(kownPub));
            }
        }

        //Test argument validations
        [TestMethod()]
        public void TestPublicApiArgValidations()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);

            using NostrCrypto crypto = _testLib.InitializeCrypto(MemoryUtil.Shared, seed);

            NCSecretKey secKey = default;
            NCPublicKey pubKey = default;

            //noThrow (its a bad sec key but it should not throw)
            crypto.ValidateSecretKey(ref secKey);
            Assert.ThrowsException<ArgumentNullException>(() => crypto.ValidateSecretKey(ref Unsafe.NullRef<NCSecretKey>()));

            //public key
            Assert.ThrowsException<ArgumentNullException>(() => crypto.GetPublicKey(ref Unsafe.NullRef<NCSecretKey>(), ref pubKey));
            Assert.ThrowsException<ArgumentNullException>(() => crypto.GetPublicKey(in secKey, ref Unsafe.NullRef<NCPublicKey>()));

        }

        [TestMethod()]
        public void CalcPaddedLenTest()
        {
            //Get valid padding test vectors
            (int, int)[] paddedSizes = _testVectors.RootElement.GetProperty("v2")
                .GetProperty("valid")
                .GetProperty("calc_padded_len")
                .EnumerateArray()
                .Select(v =>
                {
                    int[] testVals = v.Deserialize<int[]>()!;
                    return (testVals[0], testVals[1]);
                }).ToArray();


            foreach ((int len, int paddedLen) in paddedSizes)
            {
                Assert.AreEqual<int>(paddedLen, Nip44Util.CalcBufferSize(len));
            }
        }

        [TestMethod()]
        public void EncryptionTest()
        {
            //get valid encryption test vectors from vector file
            EncryptionVector[] vectors = _testVectors.RootElement.GetProperty("v2")
                .GetProperty("valid")
                .GetProperty("encrypt_decrypt")
                .EnumerateArray()
                .Select(v => v.Deserialize<EncryptionVector>()!)
                .ToArray();

            using NostrCrypto nc = _testLib.InitializeCrypto(MemoryUtil.Shared, RandomHash.GetRandomBytes(32));

            Span<byte> hmacKeyOut = stackalloc byte[LibNoscrypt.NC_HMAC_KEY_SIZE];

            foreach (EncryptionVector v in vectors)
            {                
                ReadOnlySpan<byte> secKey1 = Convert.FromHexString(v.sec1);
                ReadOnlySpan<byte> secKey2 = Convert.FromHexString(v.sec2);
                ReadOnlySpan<byte> plainText = Encoding.UTF8.GetBytes(v.plaintext);
                ReadOnlySpan<byte> nonce = Convert.FromHexString(v.nonce);
                ReadOnlySpan<byte> payload = Convert.FromBase64String(v.payload);
                ReadOnlySpan<byte> conversationKey = Convert.FromHexString(v.conversation_key);

                //Convert the plaintext data to a valid input buffer
                ReadOnlySpan<byte> pt = ToInputData(plainText);
                Span<byte> cipherText = new byte[pt.Length];

                ReadOnlySpan<byte> mac = payload[..32]; //Last 32 bytes of the payload
                ReadOnlySpan<byte> validCipherText = payload.Slice(33, pt.Length);

                NCPublicKey pub1;
                NCPublicKey pub2;

                //Recover public keys
                nc.GetPublicKey(in NCUtil.AsSecretKey(secKey1), ref pub1);
                nc.GetPublicKey(in NCUtil.AsSecretKey(secKey2), ref pub2);

                //Verify mac
                bool macValid = nc.VerifyMac(
                    in NCUtil.AsSecretKey(secKey1),
                    in pub2,
                    nonce,
                    mac,
                    BuildMacData(cipherText, nonce)
                );

                Assert.IsTrue(macValid);

                //Encrypt the plaintext
                nc.Encrypt(
                    in NCUtil.AsSecretKey(secKey1),
                    in pub2,
                    nonce,
                    pt,
                    hmacKeyOut,
                    cipherText
                );

                //Make sure the cipher text matches the expected payload
                if (!cipherText.SequenceEqual(validCipherText))
                {
                    Console.WriteLine($"Input data {v.plaintext}");
                    Console.WriteLine($"Expected size: {BinaryPrimitives.ReadUInt16BigEndian(validCipherText)}, {plainText.Length}");
                    Console.WriteLine($"Actual size {BinaryPrimitives.ReadUInt16BigEndian(pt)}, {plainText.Length}");
                    Console.WriteLine($" \n{Convert.ToHexString(cipherText)}.\n{Convert.ToHexString(validCipherText)}");
                    Assert.Fail($"Cipher text does not match expected payload");
                }
            }

            static byte[] ToInputData(ReadOnlySpan<byte> plaintext)
            {
                //Compute the required plaintext buffer size
                int paddedSize = Nip44Util.CalcBufferSize(plaintext.Length + sizeof(ushort));

                byte[] data = new byte[paddedSize];

                //Format the plaintext buffer
                Nip44Util.FormatBuffer(plaintext, data, true);

                return data;
            }

            static byte[] BuildMacData(ReadOnlySpan<byte> ciphertext, ReadOnlySpan<byte> nonce)
            {
                byte[] macData = new byte[ciphertext.Length + nonce.Length];

                //Nonce then cipher text
                nonce.CopyTo(macData);
                ciphertext.CopyTo(macData.AsSpan(nonce.Length));

                return macData;
            }
        }

        void IDisposable.Dispose()
        {
            _testLib.Dispose();
            _testVectors.Dispose();
            GC.SuppressFinalize(this);
        }

        private sealed class EncryptionVector
        {
            public string sec1 { get; set; } = string.Empty;

            public string sec2 { get; set; } = string.Empty;

            public string nonce { get; set; } = string.Empty;

            public string plaintext { get; set; } = string.Empty;

            public string payload { get; set; } = string.Empty;
            public string conversation_key { get; set; } = string.Empty;
        }
    }
}