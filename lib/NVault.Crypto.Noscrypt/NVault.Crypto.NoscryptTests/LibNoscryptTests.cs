using Microsoft.VisualStudio.TestTools.UnitTesting;

using System.Runtime.CompilerServices;

using VNLib.Hashing;
using VNLib.Utils.Memory;

namespace NVault.Crypto.Noscrypt.Tests
{
    [TestClass()]
    public class LibNoscryptTests
    {
        const string NoscryptLib = @"F:\Programming\noscrypt\out\build\x64-debug\Debug\noscrypt.dll";

        [TestMethod()]
        public void InitializeTest()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);

            using LibNoscrypt library = LibNoscrypt.Load(NoscryptLib);

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

            using LibNoscrypt library = LibNoscrypt.Load(NoscryptLib);

            //Init new context and interface
            NCContext context = library.Initialize(MemoryUtil.Shared, seed);

            using NostrCrypto crypto = new(context, true);

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

        //Test argument validations
        [TestMethod()]
        public void TestPublicApiArgValidations()
        {
            //Random context seed
            ReadOnlySpan<byte> seed = RandomHash.GetRandomBytes(32);

            using LibNoscrypt library = LibNoscrypt.Load(NoscryptLib);

            //Init new context and interface
            NCContext context = library.Initialize(MemoryUtil.Shared, seed);

            using NostrCrypto crypto = new(context, true);

            NCSecretKey secKey = default;
            NCPublicKey pubKey = default;

            //noThrow (its a bad sec key but it should not throw)
            crypto.ValidateSecretKey(ref secKey);
            Assert.ThrowsException<ArgumentNullException>(() => crypto.ValidateSecretKey(ref Unsafe.NullRef<NCSecretKey>()));

            //public key
            //NoThrow
            Assert.ThrowsException<ArgumentNullException>(() => crypto.GetPublicKey(ref Unsafe.NullRef<NCSecretKey>(), ref pubKey));
            Assert.ThrowsException<ArgumentNullException>(() => crypto.GetPublicKey(in secKey, ref Unsafe.NullRef<NCPublicKey>()));

        }
    }
}