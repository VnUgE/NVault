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

import 'pinia'
import { } from 'lodash'
import { PiniaPluginContext } from 'pinia'
import { shallowRef } from 'vue';
import { MfaUpdateResult, PkiPubKey, onWatchableChange } from '../../features';
import { MfaMethod } from '@vnuge/vnlib.browser';

declare module 'pinia' {
    export interface PiniaCustomProperties {
        readonly mfaEnabledMethods: Array<MfaMethod>;
        readonly pkiServerKeys: Array<PkiPubKey>;
        mfaUpsertMethod(method: MfaMethod, password: string): Promise<MfaUpdateResult>;
        mfaDisableMethod(method: MfaMethod, password: string): Promise<void>;
        mfaRefresh(): void;
        pkiAddKey(key: PkiPubKey): Promise<void>;
        pkiRemoveKey(key: PkiPubKey): Promise<void>;
    }
}

export const mfaConfigPlugin = ({ store }: PiniaPluginContext) => {
   
    const mfaEnabledMethods = shallowRef<MfaMethod[]>()
    const pkiServerKeys = shallowRef<PkiPubKey[]>()
    const { mfaConfig, pki } = store.plugins

    onWatchableChange(mfaConfig, async () => {
        //store enabled methods
        mfaEnabledMethods.value = await mfaConfig.getMfaMethods()
    }, { immediate: true })

    onWatchableChange(pki, async () => {
        //store pki keys
        pkiServerKeys.value = await pki.getAllKeys()
    }, { immediate: true })

    return {
        mfaEnabledMethods,
        pkiServerKeys,
        mfaUpsertMethod: (method: MfaMethod, password: string) => {
            return  mfaConfig.enableOrUpdate(method, password)
        },
        mfaDisableMethod: async (method: MfaMethod, password: string) => {
            await mfaConfig.disableMethod(method, password)
        },
        mfaRefresh: () => {
            mfaConfig.refresh()
            pki.refresh()
        },
        pkiAddKey: pki.addOrUpdate,
        pkiRemoveKey: pki.removeKey
    }
}
