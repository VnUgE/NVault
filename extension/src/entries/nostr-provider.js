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

const waiting = new Map();

const ext = '@vnuge/nvault-extension'

const debugLog = (...args) => {
  console.log(`[${ext}]`, ...args)
}

const sendMessage = (type, payload) => new Promise((resolve, reject) => {
  const id = Math.random().toString(36);
  waiting.set(id, { resolve, reject });
  window.postMessage({ type, payload, id, ext }, '*');
});

/**
 * Listen for messages from the content script
 */
window.addEventListener('message', ({ data }) => {
  
  //Confirm the message format is correct
  if (!data || !data.response || data.ext !== ext || !waiting.get(data.id)){
      return;
  }

  debugLog(data)

  //Explode now valid
  const { response, id } = data;

  const { resolve, reject } = waiting.get(id);
  
  if (response.error) {

    //Construct an error object from the resopnse message
    const errorMessage = response.error.message ?? response.error;
    
    let error = new Error(`${ext}: ${errorMessage}`);
    error.stack = response.error.stack;

    //Reject the promise as error
    reject(error);

  } else {
    //Resolve the promise as success
    resolve(response);
  }

  //Remove the waiter from the list
  waiting.delete(id)
});


//Expose the Nostr API to the window object
window.nostr = {
  
  //Redirect calls to the background script
  getPublicKey(){
    return sendMessage('getPublicKey', {})
  } ,

  async signEvent(event){
    const { event:ev } = await sendMessage('signEvent', { event })
    debugLog("Signed event", ev);
    return ev
  },

   getRelays(){
    return sendMessage('getRelays', {})
  },

  nip04: {
    encrypt: (peer, plaintext) => sendMessage('nip04.encrypt', { peer, plaintext }),
    decrypt: (peer, ciphertext) => sendMessage('nip04.decrypt', { peer, ciphertext }),
  },
};