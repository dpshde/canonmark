const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: watch workspace and resolve packages from the root node_modules.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

// Resolve TypeScript source of @versemark/core (package exports point at .ts).
config.resolver.extraNodeModules = {
  "@versemark/core": path.resolve(workspaceRoot, "packages/core"),
};

module.exports = config;
