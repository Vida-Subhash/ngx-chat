export enum MessageState {
    /**
     * Not yet sent
     */
    SENDING = 'sending',
    /**
     * Sent, but neither received nor seen by the recipient
     */
    SENT = 'sent',
    /**
     * The recipient client has received the message but the recipient has not seen it yet
     */
    RECIPIENT_RECEIVED = 'recipientReceived',
    /**
     * The message has been seen by the recipient
     */
    RECIPIENT_SEEN = 'recipientSeen',
}

export interface Message {
    direction: Direction;
    body: string;
    data?:string;
    datetime: Date;
    id?: string;
    delayed: boolean;
    fromArchive: boolean;
    messageId?:string;
    to?:string;
    groupId?:string;
    groupJid?: string;
    groupImageUrl?:string;
    unixtimestamp?:string;
    timestamp?:string;
    mediaType?:string;
    senderName?:string;
    senderFirstName?:string;
    senderLastName?:string;
    senderImageUrl?:string;
    senderJid?:string;
    senderId?:string;

    /**
     * if no explicit state is set for the message, use implicit contact message states instead.
     */
    state?: MessageState;
}

export enum Direction {
    in = 'in',
    out = 'out',
}
