exports.formatPhoneNumber = (phone) => {
    if (!phone) return '';
    const cleanedPhone = phone.replace(/[^0-9]/g, ''); // sirf numbers rakho
    
    if (cleanedPhone.startsWith('03')) {
      return cleanedPhone.replace(/^03/, '923');
    }
    
    if (cleanedPhone.startsWith('92')) {
      return cleanedPhone;
    }
    
    return cleanedPhone;
  };
  
  exports.extractPhoneFromOrder = (order) => {
    const rawPhone = order?.billing_address?.phone || order?.customer?.phone || '';
    return exports.formatPhoneNumber(rawPhone);
  };