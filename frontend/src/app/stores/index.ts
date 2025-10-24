import { authStore, AuthStore } from './AuthStore';
import { channelsStore, ChannelsStore } from './ChannelsStore';
import { messagesStore, MessagesStore } from '@entities/message/model/MessagesStore';
import { voiceStore, VoiceStore } from './VoiceStore';
import { usersStore, UsersStore } from '../../entities/user/model/UsersStore';

export class RootStore {
    auth: AuthStore;
    channels: ChannelsStore;
    messages: MessagesStore;
    voice: VoiceStore;
    users: UsersStore;

    constructor() {
        this.auth = authStore;
        this.channels = channelsStore;
        this.messages = messagesStore;
        this.voice = voiceStore;
        this.users = usersStore;
    }
}

export const rootStore = new RootStore();

// Export individual stores
export { authStore, channelsStore, messagesStore, voiceStore, usersStore };
