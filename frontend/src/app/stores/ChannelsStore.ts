import { makeAutoObservable, runInAction } from 'mobx';
import { fetchServers, fetchServerChannels, type Channel, type Server } from '@shared/api/serversApi';

export class ChannelsStore {
    channels: Channel[] = [];
    currentServer: Server | null = null;
    activeChannelId: string | null = null;
    isLoading = false;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    get activeChannel(): Channel | undefined {
        return this.channels.find((ch) => ch.id === this.activeChannelId);
    }

    get textChannels(): Channel[] {
        return this.channels.filter((ch) => ch.type === 'TEXT');
    }

    get voiceChannels(): Channel[] {
        return this.channels.filter((ch) => ch.type === 'VOICE');
    }

    setActiveChannel(channelId: string | null) {
        this.activeChannelId = channelId;
    }

    async loadDefaultServer() {
        this.isLoading = true;
        this.error = null;

        try {
            const servers = await fetchServers();

            runInAction(() => {
                // Take first server (default server)
                if (servers.length > 0) {
                    this.currentServer = servers[0];
                    this.loadChannels(servers[0].id);
                } else {
                    this.error = 'No servers found';
                    this.isLoading = false;
                }
            });
        } catch (error) {
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Failed to load server';
                this.isLoading = false;
            });
        }
    }

    async loadChannels(serverId?: string) {
        const targetServerId = serverId || this.currentServer?.id;
        if (!targetServerId) {
            this.error = 'No server selected';
            return;
        }

        this.isLoading = true;
        this.error = null;

        try {
            const channels = await fetchServerChannels(targetServerId);

            runInAction(() => {
                this.channels = channels;
                this.isLoading = false;
            });
        } catch (error) {
            runInAction(() => {
                this.error = error instanceof Error ? error.message : 'Failed to load channels';
                this.isLoading = false;
            });
        }
    }
}

export const channelsStore = new ChannelsStore();
