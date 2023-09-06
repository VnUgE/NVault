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


import {runtime} from "webextension-polyfill";

export default async function renderContent(
  cssPaths,
  render = (_appRoot) => {}
) {
  const appContainer = document.createElement("div");
  const shadowRoot = appContainer.attachShadow({
    mode: import.meta.env.DEV ? "open" : "closed",
  });
  const appRoot = document.createElement("div");

  if (import.meta.hot) {
    const { addViteStyleTarget } = await import(
      "@samrum/vite-plugin-web-extension/client"
    );

    await addViteStyleTarget(shadowRoot);
  } else {
    cssPaths.forEach((cssPath) => {
      const styleEl = document.createElement("link");
      styleEl.setAttribute("rel", "stylesheet");
      styleEl.setAttribute("href", runtime.getURL(cssPath));
      shadowRoot.appendChild(styleEl);
    });
  }

  shadowRoot.appendChild(appRoot);
  document.body.appendChild(appContainer);

  render(appRoot, shadowRoot);
}