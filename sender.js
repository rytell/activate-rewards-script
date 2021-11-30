const AWS = require('aws-sdk');

const SES_CONFIG = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'us-east-1',
};

const AWS_SES = new AWS.SES(SES_CONFIG);

const sendError = (error) => {
  let params = {
    Source: 'pedromedina190@gmail.com',
    Destination: {
      ToAddresses: [
        'xpinatapartydev@gmail.com',
        'Spicyforkbtc@gmail.com'
      ],
    },
    ReplyToAddresses: [],
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: error.toString(),
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Error Distributing Rewards for Party Piñatas`,
      }
    },
  };
  return AWS_SES.sendEmail(params).promise();
};

module.exports = {
  sendError,
};