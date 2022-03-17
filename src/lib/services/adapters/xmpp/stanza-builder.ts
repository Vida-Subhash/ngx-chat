import { xml } from '@xmpp/client';
import { Element } from 'ltx';
// import {unixTimestap} from './unixTimeStamp'
// import { id, unixTimestap } from 'src/lib/core/id-generator';
// import { id } from '../../../../../src/lib/core/id-generator';

export class StanzaBuilder {

    static buildRoomMessage(from: string, roomJid: string, content: Element[] = []): Element {
        function id(): string {
            let i;
            while (!i) {
                i = Math.random()
                    .toString(36)
                    .substr(2, 12);
            }
            return i;
        }
        // const generatedId = "9F8A1C6B-DDCB-412A-A6B3-997BF6CCF4QT";
        const generatedId = id();
        return xml('message', {from, to: roomJid, type: 'groupchat', id: generatedId},
            ...content,
        );
    }

    // static buildRoomMessageWithBody(from: string, roomJid: string, body: string, content: Element[] = []): Element {
    //     console.log("checked..")
    //     return StanzaBuilder.buildRoomMessage(from, roomJid, [
    //         xml('body', {}, body),
    //         ...content,
    //     ]);
    // }
    static buildRoomMessageWithBody(from: string, roomJid: string, body: string, content: Element[] = []): Element {
        // const stanza = xml('message', {to: roomJid, from},
        // xml('data', {xmlns: 'data:jabber'},
        // xml('senderId', {}, '23')))
        function id(): string {
            let i;
            while (!i) {
                i = Math.random()
                    .toString(36)
                    .substr(2, 12);
            }
            return i;
        }
        const generatedId = id();
        // const unixTimestap = Math.floor(Date.now() / 1000);
        const unixTimestap =  "1646799236";
        // const generatedId = "9F8A1C6B-DDCB-412A-A6B3-997BF6CCF4QT";
        return StanzaBuilder.buildRoomMessage(from, roomJid, [
            xml('data', {
                xmlns:"data:jabber",
            },
            xml('messageId',{}, generatedId),
            xml('to',{}, 'confernce'),
            xml('groupId',{}, '2'),
            xml('groupJid',{}, roomJid),
            xml('groupImageUrl',{}, "https://dubaipoliceapistage.iworklab.com/media/files/profile_pic-1646372297947.jpg"),
            xml('timestamp',{}, '2022-03-09T07:21:41.018Z'),
            xml('unixtimestamp',{}, unixTimestap),
            xml('mediaType',{}, '1'),
            xml('senderName',{}, 'Subhash Ramshetty'),
            xml('senderFirstName',{}, 'Subhash'),
            xml('senderLastName',{}, 'Ramshetty'),
            xml('senderImageUrl',{}, 'http://dubaipolice.n1.iworklab.com/files/profile_pic-1639677203429.jpeg'),
            xml('senderJid',{}, 'firoz@dbchatdev.iworklab.com'),
            xml('senderId',{}, '8'),
        ),
        xml('body', {}, body),
        ]);
        // return stanza
    }

    static buildRoomMessageWithThread(from: string, roomJid: string, body: string, thread: string): Element {
        return StanzaBuilder.buildRoomMessageWithBody(from, roomJid, body, [
            xml('thread', {}, thread),
        ]);
    }
}
