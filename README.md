
# NVault

> [!IMPORTANT]
> NVault is currently on pause, but major changes are being staged in the develop branch. I want development to be sustainable and predictable

If the dream comes true, NVault will be a truly commercial option to have the most enterprise-compliant and administrator-friendly solution available to use the nostr network in your company. With a rock solid, open source, and secure supply chain built on minimal, maintained, and trusted dependencies, it is designed for secure on-prem hosting. Highly scrutinized, transparent, and verifiable supply chain, with many of the bells and whistles you need to integrate secure nostr integration into your infrastructure with tools you're accustomed to. Hardware acceleration and remote signing agents may utilize existing x86 architecture or take advantage of HSM devices of many types. Remote agents will handle key isolation, clustering, enable hardware support, and delegation. A central server cluster will handle all of the routing, communication, user management for tight control over your user's interactions.

NVault has a security-first approach, ensuring that all aspects of the system are designed with security in mind from the ground up. This may mean that convenience features will be sacrificed in favor of security. Features may be slow to develop and release as a result. NVault aims for high stability and availability. 

## Roadmap
This project is probably best explained by the features it has and those that need to be added. If it gets enough attention, I will probably switch to building a fully featured client library with the server API for others to build actually good browser extensions and UI experiences.

### Server plugin
- ✔ Hashicorp Vault KV storage with user scopes
- ✔ Built for self-hosting only
- ✔ Secret key import
- ✔ Secure random identity creation
- ✔ SSL and all the basic web security
- ✔ Multi-user support for friends and family
- ✔ Support loading external random library (native or managed DLL)
- ✔ Note encryption/decryption
- Support a connected or network-based signing hardware
- Optionally support network-based event authorization applications
- ✔ Server-backed event history to preserve your notes
- Support for NIP-46 event signing using an external library
- Add new support for NIP-44 private messages (fast tracked)

### Extension
- ✔ Infinite identities per account
- ✔ Secret key import
- ✔ Privacy & tracking avoidance
- ✔ Most secure options by default
- ✔ Easy identity selection
- ✔ Per-user NIP-05 identity export
- ✔ Dark/light theme
- ✔ NIP-07 encryption
- Preferred relay storage (also NIP-05 relays)
- Fine-grained event permissions
- ✔ Event history
- A good-looking UI (in progress)
- Chrome and Firefox support (mobile would be nice also)
- Build fully featured library/API for other extension builders
- Strip metadata tags in events such as [#7f57800e](https://github.com/nostr-protocol/nips/pull/884/commits/7f27800e27c437ce17d223799f37631105d1ae5f)
- Add new support for NIP-44 private messages (fast tracked)

## Motivation
Nostr is a simple, new, and fun protocol I really wanted to be a part of. NIP-07 seemed like the gateway to securely contribute notes on my terms. When your identity is permanently linked to a 32-byte secret number, in my opinion, it must be taken very seriously (I feel the same way for Bitcoin). It can never be changed like a password—no whoopsie can occur, or your identity has been stolen forever. At least with Bitcoin "wallets" (more 32-byte secp256k1 secret keys) you may have the possibility of transferring your funds if you believe a breach may have occurred or rotate keys like you might passwords. This cannot happen with Nostr in the same way.

## Builds and Docs
Builds or docs are not yet available (I have my own CI pipeline for producing them) but they will be available on my website at the links below when they have been completed.

[Documentation](https://www.vaughnnugent.com/resources/software/articles?tags=docs,_nvault)  
[Build artifacts](https://www.vaughnnugent.com/resources/software/modules/nvault)  

## License
This project is licensed under the GNU AGPL v3 open source license. See LICENSE.txt for more information.

## Contributing
Right now I am too busy to worry about copyrights, PRs and such so I will not be accepting contributions at the moment. Suggestions are MORE than welcome, I prefer contact via email (see my GH profile or my website for my email address), or feel free to [tag me on nostr](nostr:nprofile1qyv8wumn8ghj7cmp9ehhyctwvajhq6tvdshxgetk9uq3zamnwvaz7tmwdaehgu3wwa5kuef0qqsqxefne258ydmfgm2wfl02fsdqgs0d5wx29kweg9amxcqxew4t7kq5c5tj7).

## Donations
If you like this project and want to support it or motivate me for faster development you can donate with fiat or on-chain BTC for now.

On-Chain Bitcoin: `bc1qgj4fk6gdu8lnhd4zqzgxgcts0vlwcv3rqznxn9`

Fiat: [Paypal](https://www.paypal.com/donate/?business=VKEDFD74QAQ72&no_recurring=0&item_name=By+donating+you+are+funding+my+love+for+producing+free+software+for+my+community.+&currency_code=USD)

