import { xml } from '@xmpp/client';
import { Element } from 'ltx';
import { id } from '../../../../core/id-generator';
import { Message } from '../../../../core/message';
import { MessageWithBodyStanza } from '../../../../core/stanza';
import { AbstractXmppPlugin } from './abstract-xmpp-plugin';

/**
 * https://xmpp.org/extensions/xep-0359.html
 */
export class MessageUuidPlugin extends AbstractXmppPlugin {

    public static extractIdFromStanza(messageStanza: Element) {
        const originIdElement = messageStanza.getChild('origin-id');
        const stanzaIdElement = messageStanza.getChild('stanza-id');
        return messageStanza.attrs.id || (originIdElement && originIdElement.attrs.id) || (stanzaIdElement && stanzaIdElement.attrs.id);
    }

    beforeSendMessage(messageStanza: Element, message: Message): void {
        const generatedId = id();
        // messageStanza.children.push(xml('origin-id', {xmlns: 'urn:xmpp:sid:0', id: generatedId}));
        // messageStanza.c('senderId', {id: 8});
        // messageStanza.children.push(xml('sendername',{}, 'subhash shetty'));
        // messageStanza.children.push(
        //     xml('data', {
        //         xmlns:"data:jabber",
        //     },
        //     xml('messageId',{}, generatedId),
        //     xml('to',{}, 'confernce'),
        //     xml('groupId',{}, '2'),
        //     xml('groupJid',{}, 'conference1645601723113@conference.dbchatdev.iworklab.com'),
        //     xml('groupImageUrl',{}),
        //     xml('timestamp',{}, '2022-03-08T10:31:77+0530'),
        //     xml('unixtimestamp',{}, '1646732883000'),
        //     xml('mediaType',{}, '1'),
        //     xml('senderName',{}, 'Subhash Ramshetty'),
        //     xml('senderFirstName',{}, 'Subhash'),
        //     xml('senderImageUrl',{}, 'http://dubaipolice.n1.iworklab.com/files/profile_pic-1639677203429.jpeg'),
        //     xml('senderJid',{}, 'firoz@dbchatdev.iworklab.com'),
        //     xml('senderId',{}, '8'),
        // ),
        // )
        if (message) {
            message.id = generatedId;
        }
    }

    afterSendMessage(message: Message, messageStanza: Element): void {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

    afterReceiveMessage(message: Message, messageStanza: MessageWithBodyStanza) {
        message.id = MessageUuidPlugin.extractIdFromStanza(messageStanza);
    }

}
