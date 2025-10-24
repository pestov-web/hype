import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create system user (owner of default server)
    const systemUser = await prisma.user.upsert({
        where: { username: 'system' },
        update: {},
        create: {
            username: 'system',
            displayName: 'System',
            email: null,
            isGuest: true,
            status: 'OFFLINE',
            isOnline: false,
        },
    });

    console.log('✅ System user created:', systemUser.id);

    // Create default server
    const defaultServer = await prisma.server.upsert({
        where: { id: 'default-server' },
        update: {
            name: 'Hype Community',
            description: 'Welcome to Hype! This is the default server for all users.',
        },
        create: {
            id: 'default-server',
            name: 'Hype Community',
            description: 'Welcome to Hype! This is the default server for all users.',
            ownerId: systemUser.id,
        },
    });

    console.log('✅ Default server created:', defaultServer.id);

    // Create default text channels
    const textGeneralChannel = await prisma.channel.upsert({
        where: { id: 'text-general' },
        update: {
            name: 'general',
        },
        create: {
            id: 'text-general',
            name: 'general',
            type: 'TEXT',
            serverId: defaultServer.id,
            createdById: systemUser.id,
            position: 0,
            topic: 'General discussion',
        },
    });

    const textRandomChannel = await prisma.channel.upsert({
        where: { id: 'text-random' },
        update: {
            name: 'random',
        },
        create: {
            id: 'text-random',
            name: 'random',
            type: 'TEXT',
            serverId: defaultServer.id,
            createdById: systemUser.id,
            position: 1,
            topic: 'Random stuff',
        },
    });

    console.log('✅ Text channels created:', textGeneralChannel.id, textRandomChannel.id);

    // Create default voice channels
    const voiceGeneralChannel = await prisma.channel.upsert({
        where: { id: 'voice-general' },
        update: {
            name: 'General Voice',
        },
        create: {
            id: 'voice-general',
            name: 'General Voice',
            type: 'VOICE',
            serverId: defaultServer.id,
            createdById: systemUser.id,
            position: 2,
            userLimit: null, // Unlimited
            bitrate: 64, // 64 kbps
        },
    });

    const voiceGamingChannel = await prisma.channel.upsert({
        where: { id: 'voice-gaming' },
        update: {
            name: 'Gaming',
        },
        create: {
            id: 'voice-gaming',
            name: 'Gaming',
            type: 'VOICE',
            serverId: defaultServer.id,
            createdById: systemUser.id,
            position: 3,
            userLimit: null,
            bitrate: 64,
        },
    });

    console.log('✅ Voice channels created:', voiceGeneralChannel.id, voiceGamingChannel.id);

    // Create welcome messages in general channel
    const welcomeMessage1 = await prisma.message.upsert({
        where: { id: 'msg-welcome-1' },
        update: {},
        create: {
            id: 'msg-welcome-1',
            content: 'Welcome to Hype Community! 👋',
            authorId: systemUser.id,
            channelId: textGeneralChannel.id,
            edited: false,
        },
    });

    const welcomeMessage2 = await prisma.message.upsert({
        where: { id: 'msg-welcome-2' },
        update: {},
        create: {
            id: 'msg-welcome-2',
            content: 'This is a default server where you can chat and voice call with others.',
            authorId: systemUser.id,
            channelId: textGeneralChannel.id,
            edited: false,
        },
    });

    const welcomeMessage3 = await prisma.message.upsert({
        where: { id: 'msg-welcome-3' },
        update: {},
        create: {
            id: 'msg-welcome-3',
            content: 'Feel free to create your own channels and customize your profile! 🚀',
            authorId: systemUser.id,
            channelId: textGeneralChannel.id,
            edited: false,
        },
    });

    console.log('✅ Welcome messages created:', welcomeMessage1.id, welcomeMessage2.id, welcomeMessage3.id);

    console.log('🎉 Database seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
