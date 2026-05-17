const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    // Menyiapkan konfigurasi transport email (bisa via service seperti Gmail atau custom SMTP)
    const transportConfig = process.env.EMAIL_SERVICE
        ? {
              service: process.env.EMAIL_SERVICE,
              auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS,
              },
          }
        : {
              host: process.env.EMAIL_HOST,
              port: process.env.EMAIL_PORT,
              secure: process.env.EMAIL_SECURE === "true" || process.env.EMAIL_PORT == 465,
              auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS,
              },
          };

    const transporter = nodemailer.createTransport(transportConfig);

    const mailOptions = {
        from: process.env.EMAIL_FROM || "Goede Shoes <noreply@goedeshoes.com>",
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
