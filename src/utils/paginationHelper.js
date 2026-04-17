exports.getPagination = (query) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
  };
  
exports.getPaginationResponse = (total, page, limit) => {
    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
};