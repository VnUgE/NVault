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

import { runtime } from "webextension-polyfill";
import { createApp } from "vue";
import { defer } from "lodash";
import { createPinia } from 'pinia';
import { useBackgroundPiniaPlugin, identityPlugin, originPlugin, permissionsPlugin } from '../../store'
import { onLoad } from "../util";
import ListBox from '../../../components/ListBox.vue'
import renderContent from "../renderContent";
import App from "./App.vue";
import Notification from '@kyvg/vue3-notification'
import '@fontsource/noto-sans-masaram-gondi'

//We need inline styles to inject into the shadow dom
import tw from "~/assets/all.scss?inline";
import localStyle from './style.scss?inline'

/* FONT AWESOME CONFIG */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCircleInfo)

//The extension name, same as nostr-provider script path
const ext = '@vnuge/nvault-extension'
const scriptUrl = runtime.getURL('src/entries/nostr-provider.js')

renderContent([], (appRoot, shadowRoot) => {

  //Create the background feature wiring
  const bgPlugins = useBackgroundPiniaPlugin('content-script')
  //Init store and add plugins
  const store = createPinia()
    .use(bgPlugins)
    .use(identityPlugin)
    .use(originPlugin)
    .use(permissionsPlugin)

  //Add tailwind styles just to the shadow dom element
  const style = document.createElement('style')
  style.textContent = tw.toString()
  shadowRoot.appendChild(style)

  //Add local styles
  const style2 = document.createElement('style')
  style2.textContent = localStyle.toString()
  shadowRoot.appendChild(style2)

  createApp(App)
  .use(store)
  .use(Notification)
  .component('fa-icon', FontAwesomeIcon)
  .component('list-box', ListBox)
  .mount(appRoot);

  //Load the nostr shim
  defer(() => onLoad(ext, scriptUrl))
});