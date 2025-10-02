"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPresignedUpload = createPresignedUpload;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION });
async function createPresignedUpload(opts) {
    const cmd = new client_s3_1.PutObjectCommand({
        Bucket: opts.bucket,
        Key: opts.key,
        ContentType: opts.type,
        ACL: 'private',
    });
    const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn: 60 });
    return { url };
}
//# sourceMappingURL=s3.services.js.map