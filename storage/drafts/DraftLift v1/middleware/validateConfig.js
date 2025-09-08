function validateConfigMiddleware(req, res, next) {
  const { GIT } = req.body;
  if (!GIT || !GIT.enabled) {
    return next();
  }
  const requiredFields = ["userName", "userEmail", "owner", "branch", "auth"];
  for (const field of requiredFields) {
    if (!GIT[field] || typeof GIT[field] !== "string" || !GIT[field].trim()) {
      return res.status(400).json({
        ok: false,
        message: `Git setting '${field}' is missing or empty.`,
      });
    }
  }
  if (GIT.auth === "token") {
    delete GIT.username;
    delete GIT.password;
  } else if (GIT.auth === "basic") {
    delete GIT.token;
  }
  if (GIT.auth === "token") {
    if (!GIT.token || !GIT.token.trim()) {
      return res.status(400).json({
        ok: false,
        message: "Authentication method is Token, but token is not provided.",
      });
    }
  } else if (GIT.auth === "basic") {
    if (
      !GIT.username ||
      !GIT.username.trim() ||
      !GIT.password ||
      !GIT.password.trim()
    ) {
      return res.status(400).json({
        ok: false,
        message:
          "Authentication method is Basic, but username or password is not provided.",
      });
    }
  }
  Object.keys(GIT).forEach((key) => {
    if (typeof GIT[key] === "string") {
      GIT[key] = GIT[key].trim();
    }
  });
  next();
}

module.exports = { validateConfigMiddleware };
