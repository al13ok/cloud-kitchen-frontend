// S3 Configuration for Mobiloitte logos and bot images
export const S3_CONFIG = {
  BUCKET_NAME: 'ragchatbot-bucket',
  REGION: 'us-east-1',
  LOGOS: {
    PRIMARY: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/Mobiloitte-logo.png',
    ALTERNATIVE: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/Mobiloitte-logo-alt.png'
  },
  BOTS: {
    BOT1: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/bot1.png',
    BOT2: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/bot2.png',
    BOT3: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/bot3.png',
    BOT4: 'https://ragchatbot-bucket.s3.amazonaws.com/logos/bot4.png'
  }
};

// Helper function to get logo URL
export const getLogoUrl = (type: 'primary' | 'alternative' = 'primary') => {
  return type === 'primary' ? S3_CONFIG.LOGOS.PRIMARY : S3_CONFIG.LOGOS.ALTERNATIVE;
};

// Helper function to get bot image URL
export const getBotImageUrl = (botNumber: 1 | 2 | 3 | 4) => {
  const botKey = `BOT${botNumber}` as keyof typeof S3_CONFIG.BOTS;
  return S3_CONFIG.BOTS[botKey];
}; 