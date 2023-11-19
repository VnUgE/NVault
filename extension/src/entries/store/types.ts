import {  } from "webextension-polyfill";
import { PluginConfig } from "../../features";

export interface NostrStoreState {
    loggedIn: boolean;
    userName: string | null;
    settings: PluginConfig;
    darkMode: boolean;
}