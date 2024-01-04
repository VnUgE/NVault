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

import { createApp } from "vue";
import { createPinia } from "pinia";
import { identityPlugin, originPlugin, useBackgroundPiniaPlugin } from '../store'
import App from "./App.vue";
import Notifications from "@kyvg/vue3-notification";
import '@fontsource/noto-sans-masaram-gondi'
import "~/assets/all.scss";
import "./local.scss"

/* FONT AWESOME CONFIG */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faArrowRightFromBracket, faCopy, faEdit, faGear, faMinus, faMoon, faPlus, faRefresh, faSpinner, faSun } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faSpinner, faEdit, faGear, faCopy, faArrowRightFromBracket, faPlus, faMinus, faSun, faMoon, faRefresh)

const bgPlugin = useBackgroundPiniaPlugin('popup')

const pinia = createPinia() 
    .use(bgPlugin) //Add the background pinia plugin
    .use(identityPlugin)
    .use(originPlugin)

createApp(App)
    .use(Notifications)
    .use(pinia)
    .component('fa-icon', FontAwesomeIcon)
    .mount("#app");
