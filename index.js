const authFunctionName = "requireAuth";
const importMatch = "server/actions.*$";
const actionsImportRegex = new RegExp(importMatch);

// Helper functions moved outside create scope
function getFunctionName(node) {
  if (node && node.type === "Identifier") {
    return node.name;
  }
  if (node && node.type === "CallExpression") {
    return getFunctionName(node.callee);
  }
  return null;
}

module.exports.rules = {
  "require-auth": {
    create(context) {
      // Cache for import checks
      const importedFunctions = new Set();
      let initialized = false;

      function initializeImportCache() {
        if (initialized) return;
        const importDeclarations = context
          .getSourceCode()
          .ast.body.filter(
            (statement) => statement.type === "ImportDeclaration"
          );

        importDeclarations.forEach((importDecl) => {
          if (actionsImportRegex.test(importDecl.source.value)) {
            importDecl.specifiers.forEach((specifier) => {
              importedFunctions.add(specifier.local.name);
            });
          }
        });
        initialized = true;
      }

      // Simplified import check using Set
      function isActionsImport(functionName) {
        initializeImportCache();
        return importedFunctions.has(functionName);
      }

      // Cache for wrapped auth checks
      const wrappedCheckCache = new WeakMap();
      function isWrappedInAuthFn(node) {
        if (wrappedCheckCache.has(node)) {
          return wrappedCheckCache.get(node);
        }

        let parent = node.parent;
        while (parent) {
          if (
            parent.type === "CallExpression" &&
            parent.callee.name === authFunctionName
          ) {
            wrappedCheckCache.set(node, true);
            return true;
          }
          parent = parent.parent;
        }
        wrappedCheckCache.set(node, false);
        return false;
      }

      return {
        Program() {
          // Initialize cache on program start
          initializeImportCache();
        },

        VariableDeclarator(node) {
          const functionName = getFunctionName(node.init);
          if (
            functionName &&
            isActionsImport(functionName) &&
            !isWrappedInAuthFn(node)
          ) {
            context.report({
              node,
              message: `References to functions from server/actions must be wrapped in \`${authFunctionName}\`.`,
            });
          }
        },

        CallExpression(node) {
          const functionName = getFunctionName(node.callee);
          if (
            functionName &&
            isActionsImport(functionName) &&
            !isWrappedInAuthFn(node)
          ) {
            context.report({
              node,
              message: `Function calls from server/actions must be wrapped in \`${authFunctionName}\`.`,
            });
          }
          node.arguments.forEach((arg) => {
            const argFunctionName = getFunctionName(arg);
            if (
              argFunctionName &&
              isActionsImport(argFunctionName) &&
              !isWrappedInAuthFn(arg)
            ) {
              context.report({
                node: arg,
                message: `Function references from server/actions must be wrapped in \`${authFunctionName}\`.`,
              });
            }
          });
        },
      };
    },
  },
};
