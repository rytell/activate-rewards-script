
// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs

const sendError = async (error) => {
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const recipients = ['pluismedinaf@yahoo.com', 'pedromedina190@gmail.com'];

  const msg = {
    from: 'pedromedina190@gmail.com',
    subject: 'Error at PartySwap Rewards Distribution',
    text: error.toString()
  }

  try {
    await Promise.all(recipients.map(recipient => {
      sgMail.send({ ...msg, to: recipient });
      console.log(': SENT EMAIL')
    }));
  } catch (error) {
    console.log(error, ': ERROR SENDING EMAIL');
  }

}


module.exports = {
  sendError
}