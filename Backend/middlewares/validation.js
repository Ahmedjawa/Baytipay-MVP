const Joi = require('joi');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.body.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: error.details.map(d => d.message)
      });
    }
    next();
  };
};

module.exports = { validate };