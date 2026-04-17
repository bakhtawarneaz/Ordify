const { Op } = require('sequelize');
const Order = require('../models/order.model');
const Store = require('../models/store.model');
const Tag = require('../models/tag.model');
const { getPagination, getPaginationResponse } = require('../utils/paginationHelper');
const sequelize = require('../config/db');

exports.fetchOrders = async (query) => {
    const { store_id, order_number, order_id, tag, status, date_from, date_to } = query;
  
    const where = {};
  
    if (store_id) {
      where.store_id = store_id;
    }
  
    if (order_id) {
      where.order_id = order_id;
    } 
  
    if (order_number) {
      where.order_number = { [Op.iLike]: `%${order_number}%` };
    }

    if (date_from || date_to) {
        if (date_from && date_to) {
          where[Op.and] = [
            ...(where[Op.and] || []),
            sequelize.literal(`DATE("Order"."createdAt") >= '${date_from}'`),
            sequelize.literal(`DATE("Order"."createdAt") <= '${date_to}'`),
          ];
        } else if (date_from) {
          where[Op.and] = [
            ...(where[Op.and] || []),
            sequelize.literal(`DATE("Order"."createdAt") = '${date_from}'`),
          ];
        } else if (date_to) {
          where[Op.and] = [
            ...(where[Op.and] || []),
            sequelize.literal(`DATE("Order"."createdAt") = '${date_to}'`),
          ];
        }
      }

    if (tag) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          sequelize.literal(`"order_data"->>'tags' ILIKE '%${tag.replace(/'/g, "''")}%'`),
        ];
    }
  
    const { page: pageNum, limit: pageSize, offset } = getPagination(query);
  
    const findOptions = {
        where,
        include: [{ model: Store, attributes: ['id', 'store_name', 'store_url'] }],
        order: [['id', 'DESC']],
      };
      
      if (!status) {
        findOptions.limit = pageSize;
        findOptions.offset = offset;
      }
      
    const { count, rows } = await Order.findAndCountAll(findOptions);
  
    const tagWhere = store_id ? { store_id } : {};
    const storeTags = await Tag.findAll({ where: tagWhere });
  
    const formatted = rows.map((order) => {
      const data = order.order_data;
      const orderTags = data.tags || '';
  
      let orderStatus = 'pending';
      const tagList = orderTags.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  
      for (const storeTag of storeTags) {
        if (tagList.includes(storeTag.name.toLowerCase().trim())) {
          if (storeTag.meaning === 'confirm') { orderStatus = 'confirmed'; break; }
          if (storeTag.meaning === 'cancel') { orderStatus = 'cancelled'; break; }
        }
      }
  
      if (orderStatus === 'pending') {
        const hoursSinceCreation = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceCreation >= 24) orderStatus = 'expired';
      }
  
      const isCOD = data.payment_gateway_names?.includes('Cash on Delivery (COD)');
      const customerName = `${data.billing_address?.first_name || ''} ${data.billing_address?.last_name || ''}`.trim() || 'N/A';
      const customerPhone = data.billing_address?.phone || data.shipping_address?.phone || data.customer?.phone || 'N/A';
      const items = (data.line_items || []).map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));
  
      return {
        id: order.id,
        store_name: order.Store?.store_name || 'N/A',
        order_id: order.order_id,
        order_number: order.order_number,
        order_type: isCOD ? 'COD' : 'Prepaid',
        customer_name: customerName,
        customer_phone: customerPhone,
        total: data.total_price,
        order_status: orderStatus,
        items,
        tags: orderTags,
        date: data.created_at,
      };
    });
  
    let result = formatted;
    if (status) {
    result = formatted.filter(o => o.order_status === status.toLowerCase());
    const paginatedResult = result.slice(offset, offset + pageSize);
    return {
        success: true,
        data: paginatedResult,
        pagination: getPaginationResponse(result.length, pageNum, pageSize),
    };
    }

    return {
    success: true,
    data: result,
    pagination: getPaginationResponse(count, pageNum, pageSize),
    };

  };