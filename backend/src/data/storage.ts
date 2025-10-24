import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Message } from './defaultServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(__dirname, '../../.storage');
const MESSAGES_FILE = path.join(STORAGE_DIR, 'messages.json');

/**
 * Ensure storage directory exists
 */
async function ensureStorageDir() {
    try {
        await fs.mkdir(STORAGE_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to create storage directory:', error);
    }
}

/**
 * Load messages from file
 */
export async function loadMessages(): Promise<Map<string, Message[]>> {
    try {
        await ensureStorageDir();
        const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
        const parsed = JSON.parse(data);

        // Convert back to Map and parse dates
        const messagesMap = new Map<string, Message[]>();
        Object.entries(parsed).forEach(([channelId, messages]) => {
            const parsedMessages = (messages as any[]).map((msg) => ({
                ...msg,
                createdAt: new Date(msg.createdAt),
            }));
            messagesMap.set(channelId, parsedMessages);
        });

        console.log('✅ Loaded messages from storage');
        return messagesMap;
    } catch (error) {
        // File doesn't exist or is corrupted, return empty map
        console.log('📁 No existing messages, starting fresh');
        return new Map();
    }
}

/**
 * Save messages to file
 */
export async function saveMessages(messagesMap: Map<string, Message[]>): Promise<void> {
    try {
        await ensureStorageDir();

        // Convert Map to object for JSON serialization
        const obj: Record<string, Message[]> = {};
        messagesMap.forEach((messages, channelId) => {
            obj[channelId] = messages;
        });

        await fs.writeFile(MESSAGES_FILE, JSON.stringify(obj, null, 2), 'utf-8');
        console.log('💾 Saved messages to storage');
    } catch (error) {
        console.error('Failed to save messages:', error);
    }
}

/**
 * Auto-save messages periodically (every 30 seconds)
 */
export function setupAutoSave(messagesMap: Map<string, Message[]>) {
    setInterval(() => {
        saveMessages(messagesMap);
    }, 30000); // 30 seconds

    // Also save on process exit
    process.on('SIGINT', async () => {
        await saveMessages(messagesMap);
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await saveMessages(messagesMap);
        process.exit(0);
    });
}
