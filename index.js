module.exports = {
  rules: {
    "require-auth": {
      create: function (context) {
        return {
          ExportDefaultDeclaration(node) {
            if (
              (node.declaration.type === "FunctionDeclaration" ||
                node.declaration.type === "FunctionExpression" ||
                node.declaration.type === "ArrowFunctionExpression") &&
              node.declaration.async
            ) {
              context.getScope().block.body.forEach((statement) => {
                if (
                  statement.type === "VariableDeclaration" &&
                  statement.declarations[0].init &&
                  statement.declarations[0].init.type === "AwaitExpression" &&
                  !isWrappedInRequireAuth(statement.declarations[0].init)
                ) {
                  context.report({
                    node: statement,
                    message:
                      "Awaited functions must be wrapped in requireAuth.",
                  });
                }
              });
            }
          },
        };

        function isWrappedInRequireAuth(node) {
          let parent = node.parent;
          while (parent) {
            if (
              parent.type === "CallExpression" &&
              parent.callee.name === "requireAuth"
            ) {
              return true;
            }
            parent = parent.parent;
          }
          return false;
        }
      },
    },
  },
};
