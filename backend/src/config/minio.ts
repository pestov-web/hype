import { Client } from 'minio';

export const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export const bucketName = process.env.MINIO_BUCKET_NAME || 'hype-uploads';

// Инициализация bucket при старте сервера
export async function initializeMinio() {
    try {
        const bucketExists = await minioClient.bucketExists(bucketName);

        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
            console.log(`✅ MinIO bucket '${bucketName}' created successfully`);

            // Установить публичную политику для аватаров
            const policy = {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/avatars/*`],
                    },
                ],
            };

            await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
            console.log(`✅ MinIO bucket policy set for public avatars`);
        } else {
            console.log(`✅ MinIO bucket '${bucketName}' already exists`);
        }
    } catch (error) {
        console.error('❌ MinIO initialization error:', error);
        throw error;
    }
}
