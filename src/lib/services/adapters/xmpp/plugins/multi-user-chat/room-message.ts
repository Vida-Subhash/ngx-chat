import { Message } from '../../../../../core/message';
import { JID } from '@xmpp/jid';

export interface RoomMessage extends Message {
    from: JID;
}

export interface dubaipolicmsg extends RoomMessage {

}
