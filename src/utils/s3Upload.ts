// Fix for missing aws-sdk types
// If you see type errors, run: npm install --save-dev @types/aws-sdk
import AWS from 'aws-sdk';
import fs from 'fs';

// Configure AWS
AWS.config.update({
  region: 'us-east-1', // Update this to your S3 bucket region
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

export const uploadToS3 = async (
  file: File | Buffer,
  fileName: string,
  contentType: string
): Promise<string> => {
  const params = {
    Bucket: 'ragchatbot-bucket', // Your S3 bucket name
    Key: `logos/${fileName}`,
    Body: file,
    ContentType: contentType,
  };

  try {
    const result = await s3.upload(params).promise();
    return result.Location;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
};

export const uploadImageFromPath = async (
  filePath: string,
  fileName: string
): Promise<string> => {
  const fileBuffer = fs.readFileSync(filePath);
  return uploadToS3(fileBuffer, fileName, 'image/png');
}; 