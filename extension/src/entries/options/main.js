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


import { createApp } from "vue";
import App from "./App.vue";
import '@fontsource/noto-sans-masaram-gondi'
import "~/assets/all.scss";
import Notifications from "@kyvg/vue3-notification";
import Pagination from '../../components/Pagination.vue';

/* FONT AWESOME CONFIG */
import { library } from '@fortawesome/fontawesome-svg-core'
import { faCheck, faChevronLeft, faChevronRight, faCopy, faDownload, faEdit, faEllipsisV, faExternalLinkAlt, faLock, faLockOpen, faMinusCircle, faMoon, faPlus, faRefresh, faSun, faTrash, faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { createPinia } from "pinia";
import { identityPlugin, mfaConfigPlugin, originPlugin, permissionsPlugin, useBackgroundPiniaPlugin } from "../store";

library.add(faCopy, faEdit, faChevronLeft, faMoon, faSun, faLock, faLockOpen, faExternalLinkAlt, faTrash, faDownload, faChevronRight, faPlus, faRefresh, faTrashCan, faMinusCircle ,faTrashCan, faCheck, faEllipsisV)

//Create the background feature wiring
const bgPlugins = useBackgroundPiniaPlugin('options')

const pinia = createPinia()
    .use(bgPlugins) //Add the background pinia plugin
    .use(identityPlugin) //Add the identity plugin
    .use(originPlugin) //Add the origin plugin
    .use(mfaConfigPlugin) //Add the mfa config plugin
    .use(permissionsPlugin)

createApp(App)
    .use(Notifications)
    .use(pinia)
    .component('fa-icon', FontAwesomeIcon)
    .component('pagination', Pagination)
    .mount("#app");
