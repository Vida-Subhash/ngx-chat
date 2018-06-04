import { JID, jid as parseJid } from '@xmpp/jid';
import { Subject } from 'rxjs';
import { Message } from './message';
import { dummyAvatar } from './contact-avatar';

export class Contact {

    public messages$: Subject<Message>;
    public messages: Message[] = [];
    public avatar = dummyAvatar;
    public bareJid: JID;
    private messageIdToMessage: { [key: string]: Message } = {};


    constructor(public jidPlain: string,
                public name: string,
                avatar?: string) {
        this.messages$ = new Subject();
        if (avatar) {
            this.avatar = avatar;
        }
        this.bareJid = parseJid(jidPlain).bare();
    }

    appendMessage(message: Message) {
        if (message.id && this.messageIdToMessage[message.id]) {
            console.log(`message with id ${message.id} already exists`);
            return false;
        }
        this.messages.push(message);
        this.messages$.next(message);
        this.messageIdToMessage[message.id] = message;
        return true;
    }

    public equalsBareJid(other: Contact) {
        return this.bareJid.equals(other.bareJid);
    }
}
