// Lightweight validation helper using JSON schema-like objects.
// For step 1 we keep it minimal; can swap to zod/joi later.

function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }
      if (value != null) {
        let val = value;
        if (rules.type === 'number' && typeof val === 'string' && val.trim() !== '') {
          const num = Number(val);
            if (!Number.isNaN(num)) val = num; // coerce
        }
        if (rules.type && typeof val !== rules.type) {
          errors.push(`${field} must be ${rules.type}`);
        }
        if (rules.min != null && typeof val === 'number' && val < rules.min) {
          errors.push(`${field} must be >= ${rules.min}`);
        }
        if (rules.max != null && typeof val === 'number' && val > rules.max) {
          errors.push(`${field} must be <= ${rules.max}`);
        }
        if (rules.enum && !rules.enum.includes(val)) {
          errors.push(`${field} invalid value`);
        }
        req.body[field] = val; // update coerced value
      }
    }
    if (errors.length) return res.status(400).json({ error: 'Validation failed', details: errors });
    next();
  };
}

module.exports = { validateBody };
