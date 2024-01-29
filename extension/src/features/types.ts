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

import { JsonObject } from "type-fest";

export interface DbEntry extends JsonObject {
    readonly Id: string,
    readonly Created: string,
    readonly LastModified: string
}

export interface NostrPubKey extends DbEntry {
    readonly UserName: string,
    readonly PublicKey: string,
}

export interface EventEntry extends DbEntry {
    readonly EventData: string
}

export interface NostrEvent extends JsonObject {
    KeyId: string,
    readonly id: string,
    readonly pubkey: string,
    readonly content: string,
}

export interface TaggedNostrEvent extends NostrEvent {
    tags?: any[][]
}

export interface EncryptionRequest extends JsonObject {
    readonly KeyId: string
    /**
     * The plaintext to encrypt or ciphertext 
     * to decrypt
     */
    readonly content: string
    /**
     * The other peer's public key used 
     * for encryption
     */
    readonly pubkey: string
}

export interface NostrRelay extends DbEntry {
    readonly url: string;
    readonly flags: number;
}

export interface LoginMessage extends JsonObject {
    readonly token: string
}

export interface ClientStatus extends JsonObject {
    readonly loggedIn: boolean;
    readonly userName: string | null;
    readonly mfaStatus: object | null;
}

export enum NostrRelayFlags {
    None = 0,
    Default = 1,
    Preferred = 2,
}

export enum NostrRelayMessageType{
    updateRelay = 1,
    addRelay = 2,
    deleteRelay = 3
}

export interface NostrRelayMessage extends JsonObject {
    readonly relay: NostrRelay
    readonly type: NostrRelayMessageType
}

export interface LoginMessage extends JsonObject {
    readonly token: string
    readonly username: string
    readonly password: string
}

export interface Watchable{
    /**
     * Waits for a change to the state of the 
     * watchable object. This is a one-shot promise
     * that will resolve when the state changes. This 
     * must be called again to listen for the next change. 
     */
    waitForChange(): Promise<void>;
}

export interface TotpUpdateMessage extends JsonObject {
    readonly issuer: string
    readonly digits: number
    readonly period: number
    readonly algorithm: string
    readonly secret: string
}

