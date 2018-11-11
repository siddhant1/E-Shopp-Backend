const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 2525,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  }
});

const createResetMessage = text => {
  return `
    <div class="email">
    Here is your Reset token link , Visit this link to reset your password ${text}
    </div>
    
    `;
};
exports.transport = transport;
exports.createResetMessage = createResetMessage;
