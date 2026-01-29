/*
  Variable Helper Utility
  
  Handles variable replacement in messages like:
  "Hello {{user_name}}!" → "Hello Ali!"
*/

// Replace all {{variable}} placeholders with actual values
exports.replaceVariables = (text, variables = {}) => {
    if (!text) return text;
  
    let result = text;
  
    // Replace all {{variable_name}} patterns
    const pattern = /\{\{([^}]+)\}\}/g;
  
    result = result.replace(pattern, (match, variableName) => {
      const trimmedName = variableName.trim();
  
      // Check if variable exists
      if (variables.hasOwnProperty(trimmedName)) {
        const value = variables[trimmedName];
  
        // Handle objects/arrays - convert to string
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
  
        return String(value);
      }
  
      // Variable not found - return empty string
      return '';
    });
  
    return result;
  };
  
  // Extract variable names from text
  exports.extractVariables = (text) => {
    if (!text) return [];
  
    const pattern = /\{\{([^}]+)\}\}/g;
    const variables = [];
    let match;
  
    while ((match = pattern.exec(text)) !== null) {
      const varName = match[1].trim();
      if (!variables.includes(varName)) {
        variables.push(varName);
      }
    }
  
    return variables;
  };
  
  // Check if text contains variables
  exports.hasVariables = (text) => {
    if (!text) return false;
    return /\{\{[^}]+\}\}/.test(text);
  };
  
  // Replace variables in object (recursive)
  exports.replaceVariablesInObject = (obj, variables = {}) => {
    if (!obj) return obj;
  
    if (typeof obj === 'string') {
      return exports.replaceVariables(obj, variables);
    }
  
    if (Array.isArray(obj)) {
      return obj.map(item => exports.replaceVariablesInObject(item, variables));
    }
  
    if (typeof obj === 'object') {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = exports.replaceVariablesInObject(value, variables);
      }
      return result;
    }
  
    return obj;
  };
  
  // Validate input based on type
  exports.validateInput = (input, validationType) => {
    if (!input || !validationType || validationType === 'none') {
      return { valid: true };
    }
  
    const trimmedInput = String(input).trim();
  
    switch (validationType) {
      case 'text':
        return {
          valid: trimmedInput.length > 0,
          message: 'Please enter some text',
        };
  
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return {
          valid: emailRegex.test(trimmedInput),
          message: 'Please enter a valid email address',
        };
  
      case 'phone':
        const phoneRegex = /^[+]?[\d\s-]{10,}$/;
        return {
          valid: phoneRegex.test(trimmedInput),
          message: 'Please enter a valid phone number',
        };
  
      case 'number':
        return {
          valid: !isNaN(Number(trimmedInput)),
          message: 'Please enter a valid number',
        };
  
      case 'url':
        try {
          new URL(trimmedInput);
          return { valid: true };
        } catch {
          return {
            valid: false,
            message: 'Please enter a valid URL',
          };
        }
  
      default:
        return { valid: true };
    }
  };
  
  // Format phone number (remove spaces, dashes, etc.)
  exports.formatPhoneNumber = (phone) => {
    if (!phone) return phone;
  
    // Remove all non-digit characters except +
    let formatted = phone.replace(/[^\d+]/g, '');
  
    // If starts with 0, assume Pakistan and replace with 92
    if (formatted.startsWith('0')) {
      formatted = '92' + formatted.substring(1);
    }
  
    // If doesn't start with +, add it
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
  
    return formatted;
  };
  
  // Clean phone number for comparison (just digits)
  exports.cleanPhoneNumber = (phone) => {
    if (!phone) return phone;
    return phone.replace(/\D/g, '');
  };