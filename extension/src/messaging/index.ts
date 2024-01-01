import { nanoid } from 'nanoid'
import { isEqual } from 'lodash'
import { Runtime, runtime } from 'webextension-polyfill'
import { serializeError, isErrorLike, type ErrorObject, deserializeError } from 'serialize-error'
import type { JsonObject } from 'type-fest'

export type ChannelContext = 'background' | 'content-script' | 'popup' | 'devtools' | 'options'
export type OnMessageCallback<T extends JsonObject> = (sender: ChannelContext, payload: any) => Promise<T>

export interface ClientChannel {
    sendMessage<TSource extends JsonObject, TResult extends JsonObject>(name: string, message: TSource): Promise<TResult>
    disconnect(): void
}

export interface ListenerChannel {
    onMessage<T extends JsonObject>(name: string, onMessage: OnMessageCallback<T>): () => void
    onDisconnected(cb: () => void): void
}

export interface MessageChannel{
    openChannel(): ClientChannel
    openOnMessageChannel(): ListenerChannel
}

interface InternalChannelMessage{
    readonly transactionId: string
    readonly payload: JsonObject
    readonly srcContext: ChannelContext
    readonly destContext: ChannelContext
    readonly handlerName: string
}

interface InternalChannelMessageResponse{
    readonly request: InternalChannelMessage
    readonly response: JsonObject | undefined
    readonly error?: ErrorObject
}

interface SendMessageToken<T extends JsonObject> {
     readonly request: InternalChannelMessage;
     resolve(response: T): void;
     reject(error: Error): void
}

interface RxChannelState{
    addHandler(name:string, handler: OnMessageCallback<any>): () => void
    removeHandler(name:string, handler: OnMessageCallback<any>): void
    handlePortMessage(message: InternalChannelMessage, port: Runtime.Port): void
    onDisconnected(): void
}

export const createMessageChannel = (localContext: ChannelContext, randomIdSize = 32): MessageChannel => {

    const createRxChannel = (): RxChannelState => {

        const createPortResponse = (request: InternalChannelMessage, response?: JsonObject, error?: ErrorObject)
            : InternalChannelMessageResponse => {
            return { request, response, error }
        }

        //Stores open messages
        const handlerMap = new Map<string, OnMessageCallback<any>>()

        const handleMessageInternal = async (message: InternalChannelMessage): Promise<any> => {
            //OnMessage hanlders will always respond to a destination context
            if (!isEqual(message.destContext, localContext)) {
                throw new Error(`Invalid destination context ${message.destContext}`)
            }
            switch (message.srcContext) {
                case 'background':
                    throw new Error('Background context is not supported as a source')
                case 'content-script':
                case 'popup':
                case 'devtools':
                case 'options':
                    break;
                default:
                    throw new Error(`Invalid source context ${message.srcContext}`)
            }

            //Try to get the handler
            const handler = handlerMap.get(message.handlerName)
            if (handler === undefined) {
                throw new Error(`No handler for ${message.handlerName}`)
            }

            return handler(message.srcContext, message.payload);
        }

        return {
            addHandler(name: string, handler: OnMessageCallback<any>) {
                handlerMap.set(name, handler)
                //Return a function to remove the handler
                return () => handlerMap.delete(name)
            },
            removeHandler(name: string) {
                handlerMap.delete(name)
            },
            async handlePortMessage(message: InternalChannelMessage, port: Runtime.Port) {

                let isConnected = true
                const onDisconnected = () => {
                    isConnected = false
                }

                //Add disconnect handler so we can know if the port has disconnected
                port.onDisconnect.addListener(onDisconnected)

                try {

                    //Invoke internal message handler and convert to promise response
                    const response = await handleMessageInternal(message);

                    if (!isConnected) {
                        return
                    }
                  
                    port.postMessage(
                        createPortResponse(message, response)
                    )
                }
                catch (err: unknown) {
                    if (!isConnected) {
                        return
                    }

                    //try to serialize the error
                    const handlerError = isErrorLike(err) ? serializeError(err) : err as ErrorObject

                    //Send the error back to the port
                    port.postMessage(
                        createPortResponse(message, undefined, handlerError)
                    )
                }
                finally {
                    //remove disconnect handler
                    port.onDisconnect.removeListener(onDisconnected)
                }
            },
            onDisconnected() {
            }
        }
    }

    const createTxChannel = (destContext: ChannelContext) => {

        const handlerMap = new Map<string, SendMessageToken<any>>()

        return {
            sendMessage: (port: Runtime.Port) => {
                return <T extends JsonObject>(name: string, message: JsonObject): Promise<T> => {
                    //unique transaction id for message, used to match in response map
                    const transactionId = nanoid(randomIdSize)

                    //Create itnernal request wrapper
                    const request: InternalChannelMessage = {
                        transactionId,
                        payload: message,
                        srcContext: localContext,
                        destContext,
                        handlerName: name
                    }

                    //Create promise
                    const promise = new Promise<T>((resolve, reject) => {
                        //Add to handler map
                        handlerMap.set(transactionId, { request, resolve, reject })
                    })

                    //Send request
                    port.postMessage(request)

                    //Return promise
                    return promise
                }
            },
            onMessage: (message: InternalChannelMessageResponse) => {
                const { transactionId } = message.request

                //Get the handler
                const handler = handlerMap.get(transactionId)
                if (handler === undefined) {
                    throw new Error(`No waiting response handler for ${transactionId}`)
                }

                //Remove the handler
                handlerMap.delete(transactionId)

                //Check for error
                if (message.error !== undefined) {
                    //Deserialize error
                    const err = deserializeError(message.error)
                    handler.reject(err)
                }
                else {
                    handler.resolve(message.response)
                }
            },
            onReconnect: (port: Runtime.Port) => {
                //resend pending messages
                handlerMap.forEach((token, _) => port.postMessage(token.request))
            }
        }
    }

    return {
        openChannel(): ClientChannel {
            //Open the transmission channel
            const { sendMessage, onReconnect, onMessage } = createTxChannel('background');

            let port: Runtime.Port;

            /**
             * Creates a persistent connection to the background script.
             * When the port closes, it is reopend and all pending messages 
             * are resent
             */
            const connect = () => {
                port = runtime.connect()
                port.onMessage.addListener(onMessage)
                //reconnect on disconnect
                port.onDisconnect.addListener(connect)
                //resend pending messages
                onReconnect(port)
            }

            if (localContext === 'background') {
                throw new Error('Send channels are not currently supported by ')
            }

            connect()

            return {
                //Init send-message handler
                sendMessage: sendMessage(port!),
                disconnect: port!.disconnect
            }
        },
        openOnMessageChannel(): ListenerChannel {
            const { addHandler, handlePortMessage, onDisconnected } = createRxChannel()

            const onDisconnectedHandlers = new Set<() => void>()

            //Listen for new connections
            runtime.onConnect.addListener((port: Runtime.Port) => {
                port.onMessage.addListener(handlePortMessage);
                port.onDisconnect.addListener(onDisconnected);
                //Call all local handlers on on disconnect
                port.onDisconnect.addListener(() => {
                    onDisconnectedHandlers.forEach(cb => cb())
                })
            })

            return {
                onMessage: addHandler,
                //add to onDisconnectedHandlers
                onDisconnected: onDisconnectedHandlers.add,
            }
        }
    }
}