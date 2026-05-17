export const errorHandler = (err, req, res, next) => {
  req.logger.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
};