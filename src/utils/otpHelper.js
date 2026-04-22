const crypto = require('crypto');

exports.generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

exports.hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp.toString()).digest('hex');
};

exports.generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};