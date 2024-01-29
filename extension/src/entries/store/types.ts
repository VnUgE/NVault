import {  } from "webextension-polyfill";
import type { PluginConfig, EventEntry } from "../../features";

export interface NostrStoreState {
    loggedIn: boolean;
    userName: string | null;
    settings: PluginConfig;
    darkMode: boolean;
    eventHistory: EventEntry[];
}