const { GraphQLServer } = require("graphql-yoga");
const db = require("./db");
const Mutation = require("./resolvers/Mutation");
const Query = require("./resolvers/Query");

function createServer() {
  return new GraphQLServer({
    typeDefs: "src/schema.graphql",
    resolvers: {
      Mutation,
      Query
    },
    context(request) {
      return {
        ...request,
        db
      };
    }
  });
}
module.exports = createServer;