import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { Subject } from 'rxjs';
import { debounceTime, filter } from 'rxjs/operators';
import { Recipient } from '../../../../core/recipient';
import { Stanza } from '../../../../core/stanza';
import { LogService } from '../../../log.service';
import { XmppChatAdapter } from '../xmpp-chat-adapter.service';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';
import { MultiUserChatPlugin } from './multi-user-chat/multi-user-chat.plugin';
import { ServiceDiscoveryPlugin } from './service-discovery.plugin';
import { PUBSUB_EVENT_XMLNS } from './publish-subscribe.plugin';
import { MessagePlugin } from './message.plugin';
import { MUC_SUB_EVENT_TYPE } from './muc-sub.plugin';
import { Form, serializeToSubmitForm } from '../../../../core/form';

/**
 * https://xmpp.org/extensions/xep-0313.html
 * Message Archive Management
 */
export class MessageArchivePlugin extends AbstractXmppPlugin {
    static readonly MAM_NS = 'urn:xmpp:mam:2';

    private readonly mamMessageReceived$ = new Subject<void>();

    constructor(
        private readonly chatService: XmppChatAdapter,
        private readonly serviceDiscoveryPlugin: ServiceDiscoveryPlugin,
        private readonly multiUserChatPlugin: MultiUserChatPlugin,
        private readonly logService: LogService,
        private readonly messagePlugin: MessagePlugin,
    ) {
        super();

        this.chatService.state$
            .pipe(filter(state => state === 'online'))
            .subscribe(async () => {
                if (await this.supportsMessageArchiveManagement()) {
                    await this.requestNewestMessages();
                }
            });

        // emit contacts to refresh contact list after receiving mam messages
        this.mamMessageReceived$
            .pipe(debounceTime(10))
            .subscribe(() => this.chatService.contacts$.next(this.chatService.contacts$.getValue()));
    }

    private async requestNewestMessages(): Promise<void> {
        await this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: MessageArchivePlugin.MAM_NS},
                    xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                        xml('max', {}, 250),
                        xml('before'),
                    ),
                ),
            ),
        );
    }

    async loadMostRecentUnloadedMessages(recipient: Recipient): Promise<void> {
        // for user-to-user chats no to-attribute is necessary, in case of multi-user-chats it has to be set to the bare room jid
        const to = recipient.recipientType === 'room' ? recipient.roomJid.toString() : undefined;

        const form: Form = {
            type: 'submit',
            instructions: [],
            fields: [
                {type: 'hidden', variable: 'FORM_TYPE', value: MessageArchivePlugin.MAM_NS},
                ...(recipient.recipientType === 'contact'
                    ? [{type: 'jid-single', variable: 'with', value: recipient.jidBare}] as const
                    : []),
                ...(recipient.oldestMessage
                    ? [{type: 'text-single', variable: 'end', value: recipient.oldestMessage.datetime.toISOString()}] as const
                    : []),
            ],
        };

        const request =
            xml('iq', {type: 'set', to},
                xml('query', {xmlns: MessageArchivePlugin.MAM_NS},
                    serializeToSubmitForm(form),
                    xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                        xml('max', {}, 100),
                        xml('before'),
                    ),
                ),
            );

        await this.chatService.chatConnectionService.sendIq(request);
    }

    async loadAllMessages(): Promise<void> {
        if (!(await this.supportsMessageArchiveManagement())) {
            throw new Error('message archive management not suppported');
        }

        let lastMamResponse = await this.chatService.chatConnectionService.sendIq(
            xml('iq', {type: 'set'},
                xml('query', {xmlns: MessageArchivePlugin.MAM_NS}),
            ),
        );

        while (lastMamResponse.getChild('fin').attrs.complete !== 'true') {
            const lastReceivedMessageId = lastMamResponse.getChild('fin').getChild('set').getChildText('last');
            lastMamResponse = await this.chatService.chatConnectionService.sendIq(
                xml('iq', {type: 'set'},
                    xml('query', {xmlns: MessageArchivePlugin.MAM_NS},
                        xml('set', {xmlns: 'http://jabber.org/protocol/rsm'},
                            xml('max', {}, 250),
                            xml('after', {}, lastReceivedMessageId),
                        ),
                    ),
                ),
            );
        }
    }

    private async supportsMessageArchiveManagement(): Promise<boolean> {
        const supportsMessageArchiveManagement = await this.serviceDiscoveryPlugin.supportsFeature(
            this.chatService.chatConnectionService.userJid.bare().toString(),
            MessageArchivePlugin.MAM_NS,
        );
        if (!supportsMessageArchiveManagement) {
            this.logService.info('server doesn\'t support MAM');
        }
        return supportsMessageArchiveManagement;
    }

    handleStanza(stanza: Stanza): boolean {
        if (this.isMamMessageStanza(stanza)) {
            this.handleMamMessageStanza(stanza);
            return true;
        }
        return false;
    }

    private isMamMessageStanza(stanza: Stanza): boolean {
        const result = stanza.getChild('result');
        return stanza.name === 'message' && result?.attrs.xmlns === MessageArchivePlugin.MAM_NS;
    }

    private handleMamMessageStanza(stanza: Stanza): void {
        const forwardedElement = stanza.getChild('result').getChild('forwarded');
        const messageElement = forwardedElement.getChild('message');
        const delayElement = forwardedElement.getChild('delay');

        const eventElement = messageElement.getChild('event', PUBSUB_EVENT_XMLNS);
        if (messageElement.getAttr('type') == null && eventElement != null) {
            this.handlePubSubEvent(eventElement, delayElement);
        } else {
            this.handleArchivedMessage(messageElement, delayElement);
        }
    }

    private handleArchivedMessage(messageElement: Stanza, delayEl: Element): void {
        const type = messageElement.getAttr('type');
        if (type === 'chat') {
            const messageHandled = this.messagePlugin.handleStanza(messageElement, delayEl);
            if (messageHandled) {
                this.mamMessageReceived$.next();
            }
        } else if (type === 'groupchat' || this.multiUserChatPlugin.isRoomInvitationStanza(messageElement)) {
            this.multiUserChatPlugin.handleStanza(messageElement, delayEl);
        } else {
            throw new Error(`unknown archived message type: ${type}`);
        }
    }

    private handlePubSubEvent(eventElement: Element, delayElement: Element): void {
        const itemsElement = eventElement.getChild('items');
        const itemsNode = itemsElement?.attrs.node;

        if (itemsNode !== MUC_SUB_EVENT_TYPE.messages) {
            this.logService.warn(`Handling of MUC/Sub message types other than ${MUC_SUB_EVENT_TYPE.messages} isn't implemented yet!`);
            return;
        }

        const itemElements = itemsElement.getChildren('item');
        itemElements.forEach((itemEl) => this.handleArchivedMessage(itemEl.getChild('message'), delayElement));
    }
}
