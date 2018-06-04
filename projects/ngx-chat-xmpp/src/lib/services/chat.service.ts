import { Injectable } from '@angular/core';
import { x as xml } from '@xmpp/xml';
import { jid as parseJid } from '@xmpp/jid';
import { BehaviorSubject, Subject } from 'rxjs';
import { ChatPlugin, Contact, Direction, LogInRequest, MessageWithBodyStanza, Stanza } from '../core';
import { MessageArchivePlugin, StanzaUuidPlugin } from '../plugins';
import { ChatConnectionService } from './chat-connection.service';
import { LogService } from './log.service';

@Injectable()
export class ChatService {

    public message$ = new Subject<Contact>();
    public contacts$ = new BehaviorSubject<Contact[]>([]);
    public state$;
    private logInRequest: LogInRequest;
    private plugins: ChatPlugin[] = [];

    constructor(public chatConnectionService: ChatConnectionService, private logService: LogService) {
        this.state$ = chatConnectionService.state$;
        this.chatConnectionService.stanzaPresenceRequest$.subscribe((stanza) => this.onContactPresenceRequest(stanza));
        this.chatConnectionService.stanzaPresenceInformation$.subscribe((stanza) => this.onContactPresenceInformation(stanza));
        this.chatConnectionService.stanzaMessage$.subscribe((stanza) => this.onMessageReceived(stanza));
        this.chatConnectionService.stanzaUnknown$.subscribe((stanza) => this.onUnknownStanza(stanza));
    }

    initialize() {
        this.plugins = [new MessageArchivePlugin(this), new StanzaUuidPlugin()];
    }

    setContacts(newContacts: Contact[]) {
        const contactsRetained = this.contacts$.getValue()
            .filter(existingContact => newContacts.some(newContact => newContact.equalsBareJid(existingContact)));

        const contactsToAdd = newContacts
            .filter(newContact => contactsRetained.every(existingContact => existingContact.equalsBareJid(newContact)));

        this.contacts$.next(contactsRetained.concat(contactsToAdd));
    }

    getContactByJid(jidPlain: string) {
        const bareJidToFind = parseJid(jidPlain).bare();
        return this.contacts$.getValue().find(contact => contact.bareJid.equals(bareJidToFind));
    }

    logIn(logInRequest: LogInRequest): void {
        this.logInRequest = logInRequest;
        this.chatConnectionService.logIn(logInRequest);
    }

    logOut(): void {
        this.setContacts([]);
        this.chatConnectionService.logOut();
    }

    sendMessage(jid: string, body: string) {
        const messageStanza = xml('message', {to: jid, from: this.chatConnectionService.myJidWithResource, type: 'chat'},
            xml('body', {}, body)
        );
        for (const plugin of this.plugins) {
            plugin.beforeSendMessage(messageStanza);
        }
        this.chatConnectionService.send(messageStanza).then(() => {
            const contact = this.getContactByJid(jid);
            if (contact) {
                const message = {
                    direction: Direction.out,
                    body,
                    datetime: new Date()
                };
                for (const plugin of this.plugins) {
                    plugin.afterSendMessage(message, messageStanza);
                }
                contact.appendMessage(message);
            }
        }, (rej) => {
            this.logService.error('rejected', rej);
        });
    }

    onMessageReceived(messageStanza: MessageWithBodyStanza) {
        this.logService.debug('message received <=', messageStanza.getChildText('body'));
        const contact = this.getContactByJid(messageStanza.attrs.from);

        if (contact) {

            const message = {
                body: messageStanza.getChildText('body'),
                direction: Direction.in,
                datetime: new Date()
            };

            for (const plugin of this.plugins) {
                plugin.afterReceiveMessage(message, messageStanza);
            }

            contact.appendMessage(message);
            this.message$.next(contact);

        }
    }

    private onContactPresenceRequest(stanza: Stanza) {
        this.chatConnectionService.send(
            xml('presence', {to: stanza.attrs.from, type: 'subscribed'})
        );
    }

    private onContactPresenceInformation(stanza: Stanza) {
        if (stanza.getChild('show') != null) {
            // https://xmpp.org/rfcs/rfc3921.html#stanzas-presence-children-show
            const show = stanza.getChildText('show');
            if (show === 'away') {
                // away
                this.logService.debug('presence of', stanza.attrs.from, 'away');
            } else if (show === 'chat') {
                // chat
                this.logService.debug('presence of', stanza.attrs.from, 'chat');
            } else if (show === 'dnd') {
                // do not distrb
                this.logService.debug('presence of', stanza.attrs.from, 'dnd');
            } else if (show === 'xa') {
                // long away
                this.logService.debug('presence of', stanza.attrs.from, 'xa');
            } else {
                // error, undefined
            }
        } else {
            // contact available
            this.logService.debug('presence of', stanza.attrs.from, 'available');
        }
    }

    private onUnknownStanza(stanza: Stanza) {

        let handled = false;

        for (const plugin of this.plugins) {
            if (plugin.canHandleStanza(stanza)) {
                plugin.handleStanza(stanza);
                handled = true;
            }
        }

        if (!handled) {
            this.logService.debug('unknown stanza <=', stanza.toString());
        }

    }
}
