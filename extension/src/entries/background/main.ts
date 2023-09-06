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

import { runtime } from "webextension-polyfill";
import { HistoryEvent, useHistory } from "./history";
import { useNostrApi } from "./nostr-api";
import { useIdentityApi } from "./identity-api";
import { useSettings } from "./settings";
import { onMessage } from "webext-bridge/background";
import { useAuthApi } from "./auth-api";
import { JsonObject } from "type-fest";

//Init the history api
useHistory();

runtime.onInstalled.addListener(() => {
   console.info("Extension installed successfully");
});


//Register settings handlers
const { onGetSiteConfig, onSetSitConfig } = useSettings();

onMessage('getSiteConfig', onGetSiteConfig);
onMessage('setSiteConfig', onSetSitConfig);

//Register the api handlers
const { onGetProfile, onGetStatus, onLogin, onLogout, protect } = useAuthApi();

onMessage('getProfile', onGetProfile);
onMessage('getStatus', onGetStatus);
onMessage('login', onLogin);
onMessage('logout', onLogout);

//Register the identity handlers
const { onCreateIdentity, onUpdateIdentity } = useIdentityApi();

onMessage('createIdentity', onCreateIdentity);
onMessage('updateIdentity', onUpdateIdentity);

//Register the nostr handlers
const { 
  onGetPubKey,
  onSelectKey,
  onSignEvent,
  onGetAllKeys,
  onGetRelays,
  onNip04Decrypt,
  onNip04Encrypt,
  onDeleteKey,
  onSetRelay
} = useNostrApi();

onMessage('getPublicKey', onGetPubKey);
onMessage('selectKey', onSelectKey);
onMessage('signEvent', onSignEvent);
onMessage('getAllKeys', onGetAllKeys);
onMessage('getRelays', onGetRelays);
onMessage('setRelay', onSetRelay);
onMessage('deleteKey', onDeleteKey);
onMessage('nip04.decrypt', onNip04Decrypt);
onMessage('nip04.encrypt', onNip04Encrypt);

//Use history api
const { getHistory, clearHistory, removeItem, pushEvent } = useHistory();

enum HistoryType {
  get = 'get',
  clear = 'clear',
  remove = 'remove',
  push = 'push'
}

interface HistoryMessage extends JsonObject {
  action: HistoryType,
  event: string
}

onMessage <HistoryMessage>('history', protect(async ({data}) =>{
  switch(data.action){
    case HistoryType.get:
      return getHistory();
    case HistoryType.clear:
      clearHistory();
      break;
    case HistoryType.remove:
      removeItem(data.event);
      break;
    case HistoryType.push:
      pushEvent(data.event);
      break;
  }
}))