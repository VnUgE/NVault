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
import renderContent from "../renderContent";
import App from "./App.vue";
import Notification from '@kyvg/vue3-notification'
import '@fontsource/noto-sans-masaram-gondi'

//We need inline styles to inject into the shadow dom
import tw from "~/assets/all.scss?inline";
import localStyle from './style.scss?inline'

renderContent([], (appRoot, shadowRoot) => {
  createApp(App)
  .use(Notification)
  .mount(appRoot);

  //Add tailwind styles just to the shadow dom element
  const style = document.createElement('style')
  style.innerHTML = tw.toString()
  shadowRoot.appendChild(style)

  //Add local styles
  const style2 = document.createElement('style')
  style2.innerHTML = localStyle.toString()
  shadowRoot.appendChild(style2)
});