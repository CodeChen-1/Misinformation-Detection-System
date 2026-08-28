const path = require("path");

module.exports = function override(config) {
  config.resolve.alias = {
    ...config.resolve.alias,
    "react-transition-group/TransitionGroupContext": path.resolve(
      __dirname,
      "node_modules/react-transition-group/cjs/TransitionGroupContext.js"
    ),
  };
  config.ignoreWarnings = [/Failed to parse source map/];
  return config;
};
