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

namespace NVault.Plugins.Vault
{
    internal enum NostrMessageKind
    {
        SetMetaData,
        TextNote,
        RecommendedServer,
        Contacts,
        EncryptedMessage,
        EventDeletion,
        Reposts,
        Reaction,
        BadgeAward,
        
        ChannelCreation = 40,
        ChannelMetadata = 41,
        ChannelMessage = 42,
        ChannelHideMessage = 43,
        ChannelMuteUser = 44,

        FileMetadata = 1063,
        
        Reporting = 1984,

        ZapRequest = 9734,
        Zap = 9735,

        MuteList = 10000,
        PinList = 10001,
        RelayListMetadata = 10002,

        WalletInfo = 13194,
        
        ClientAuthenticate = 22242,

        WalletRequest = 23194,
        WalletResponse = 23195,

        NostrConnect = 24133,

        CategorizedPeopleList = 30000,
        CategorizedBookmarkList = 30001,

        ProfileBadges = 30008,
        BadgeDefinition = 30009,

        CreateOrUpdateStall = 30017,
        CreateOrUpdateAProduct = 30018,

        LongFormContent = 30023,

        ApplicationSpecificData = 30078,

    }
}