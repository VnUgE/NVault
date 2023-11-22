# NVault

Here is what I want this project to be. 

The only self-hosted system you need to store your nostr identities where keys can never leave the system. Even if a session gets hijacked, messages can be signed (or stopped), but keys can never be exfiltrated. Security > convenience.  

The server plugin is just one of my [VNLib.Plugins.Essentials](https://github.com/VnUgE/VNLib.Core) framework plugins. Yes this project is build on top of my experimental http framework. 

## Roadmap
This project is probably best explained by the features it has an that need to be added. If it gets enough attention, I will probably switch to building a fully featured client library with the server API for others to build actually good browser extensions and UI experiences.  

### Server plugin
- ✔ Hashicorp Vault KV storage with user scopes
- ✔ Built for self-hosting only
- ✔ Secret key import
- ✔ Secure random identity creation
- ✔ SSL and all the basic web security
- ✔ Multi user support for friends and family
- ✔ Support loading external random library (native or managed dll)
- Note encryption/decryption (in progress)
- Support a connected, or network based signing hardware
- Optionally support network based, event authorization applications
- Server backed event history to preserve your notes

### Extension
- ✔ Infinite identities per account
- ✔ Secret key import
- ✔ Privacy & tracking avoidance
- ✔ Most secure options by default
- ✔ Easy identity selection
- ✔ Per user NIP-05 identity export
- ✔ Dark/light theme
- Preferred relay storage (also NIP-05 relays)
- NIP-07 encryption (in progress)
- Fine grained event permissions
- Event history
- A good looking UI
- Chrome and Firefox support (mobile would be nice also)
- Build fully featured library/API for other extension builders
- Stip metadata tags in events such as [#7f57800e](https://github.com/nostr-protocol/nips/pull/884/commits/7f27800e27c437ce17d223799f37631105d1ae5f)

## Motivation
Nostr is a simple, new, and fun protocol I really wanted to be a part of. NIP-07 seemed like the gateway to securely contribute notes on my terms. When your identity is permanently linked to a 32 byte secret number, imo it must be taken very seriously (I feel the same way for bitcoin). It can never be changed like a password, no whoopsie can occur, or your identity has been stolen forever. At least with bitcoin "wallets" (more 32 byte secp256k1 secret keys) you may have the possibility of transferring your funds if you believe a breach may have occurred or rotate keys like you might passwords. This cannot happen with nostr in the same way.  

I am not yet a "bitcoiner" but I suspect I will use this project (or fork it) to build my own wallet system in the near future. 

## Status
Currently this project is on my last burner, behind building the entire http framework supporting it (and my blogging platform). I will commit from time to time, it will have lots of bugs.

## Builds and Docs
Builds or docs are not yet available (I have my own CI pipeline for producing them) but they will be available on my website at the links below when they have been completed.

[Documentation](https://www.vaughnnugent.com/resources/software/articles?tags=docs,_nvault)    
[Build artifacts](https://www.vaughnnugent.com/resources/software/modules/nvault)    

## License
This project is licensed under the GNU AGPL v3 open source license. See LICENSE.txt for more information.  

## Contributing
Right now I am too busy to worry about copyrights, prs and such so I will not be accepting contributions at the moment. Suggestions are MORE than welcome, I prefer contact via email (see my GH profile or my website for my email address). This will change in the future if I get more time or an alternate source of income.  

Actually, if you are a front-end developer with some good UI/design skils and are intersted in making the UI look better, let me know! 