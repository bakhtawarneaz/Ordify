const menuService = require('../services/menu.service');

exports.create = async (req, reply) => {
  try {
    const res = await menuService.createMenu(req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.update = async (req, reply) => {
  try {
    const res = await menuService.updateMenu(req.params.id, req.body);
    return reply.code(res.success ? 200 : 400).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.toggleStatus = async (req, reply) => {
  try {
    const res = await menuService.toggleMenuStatus(req.body);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getOne = async (req, reply) => {
  try {
    const res = await menuService.getMenuById(req.params.id);
    return reply.code(res.success ? 200 : 404).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.getAll = async (req, reply) => {
  try {
    const res = await menuService.getAllMenus();
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};

exports.myMenus = async (req, reply) => {
  try {
    const res = await menuService.getMyMenus(req.user);  
    return reply.code(200).send(res);
  } catch (err) {
    return reply.code(500).send({ success: false, message: err.message });
  }
};