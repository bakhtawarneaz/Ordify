const jwt = require('jsonwebtoken');

exports.verifyToken = async (req, reply) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return reply.code(401).send({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    return; // 🔥 important for Fastify
  } catch (err) {
    return reply.code(401).send({ success: false, message: 'Invalid or expired token' });
  }
};