exports.success = (reply, message, data = {}) => {
    return reply.code(200).send({
      success: true,
      message,
      data
    });
  };
  
exports.error = (reply, message = 'Something went wrong', code = 500, errors = null) => {
  return reply.code(code).send({
      success: false,
      message,
      errors,
  });
};