require('dotenv').config({ path: '.env.local' });
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

const uploadFileToS3 = async (filePath, fileName) => {
  const fileBuffer = fs.readFileSync(filePath);
  
  const params = {
    Bucket: 'ragchatbot-bucket',
    Key: `logos/${fileName}`,
    Body: fileBuffer,
    ContentType: 'image/png',
  };

  try {
    const result = await s3.upload(params).promise();
    console.log(`✅ Uploaded ${fileName} to S3: ${result.Location}`);
    return result.Location;
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error);
    throw error;
  }
};

const uploadLogos = async () => {
  console.log('🚀 Starting logo upload to S3...');
  console.log('🔑 AWS Configuration:');
  console.log('- Region:', process.env.AWS_REGION || 'us-east-1');
  console.log('- Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('- Secret Access Key:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('');
  
  const logos = [
    {
      localPath: 'public/images/user/Mobiloitte.png',
      fileName: 'Mobiloitte-logo.png'
    },
    {
      localPath: 'public/images/user/Mobiloitte1.png',
      fileName: 'Mobiloitte-logo-alt.png'
    },
    {
      localPath: 'public/images/user/Bot1.png',
      fileName: 'bot1.png'
    },
    {
      localPath: 'public/images/user/Bot2.png',
      fileName: 'bot2.png'
    },
    {
      localPath: 'public/images/user/Bot3.png',
      fileName: 'bot3.png'
    },
    {
      localPath: 'public/images/user/Bot4.png',
      fileName: 'bot4.png'
    }
  ];

  const uploadedUrls = [];

  for (const logo of logos) {
    console.log(`🔍 Checking file: ${logo.localPath}`);
    if (fs.existsSync(logo.localPath)) {
      console.log(`✅ File exists, uploading: ${logo.fileName}`);
      const url = await uploadFileToS3(logo.localPath, logo.fileName);
      uploadedUrls.push({
        fileName: logo.fileName,
        url: url
      });
    } else {
      console.log(`⚠️  File not found: ${logo.localPath}`);
    }
  }

  console.log('\n📋 Upload Summary:');
  uploadedUrls.forEach(item => {
    console.log(`- ${item.fileName}: ${item.url}`);
  });

  return uploadedUrls;
};

// Run the upload
uploadLogos().catch(console.error); 