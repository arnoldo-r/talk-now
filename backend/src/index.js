import { createYoga, createSchema, createPubSub } from "graphql-yoga";
import { useServer } from "graphql-ws/use/ws";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";

const messages = [];
const pubsub = createPubSub();

const typeDefs = `
  type Message {
    id: ID!
    user: String!
    content: String!
  }

  type Query {
    messages: [Message!]
  }

  type Mutation {
    postMessage(user: String!, content: String!): ID!
  }

  type Subscription {
    messages: [Message!]
  }
`;

const resolvers = {
  Query: {
    messages: () => {
      return messages;
    },
  },
  Mutation: {
    postMessage: (parent, { user, content }) => {
      const id = messages.length.toString();
      messages.push({
        id,
        user,
        content,
      });
      pubsub.publish("MESSAGES_UPDATED", { messages });
      return id;
    },
  },
  Subscription: {
    messages: {
      subscribe: () => {
        return pubsub.subscribe("MESSAGES_UPDATED");
      },
      resolve: (payload) => {
        if (payload && payload.messages) {
          return payload.messages;
        } else {
          return [];
        }
      },
    },
  },
};

const schema = createSchema({
  typeDefs,
  resolvers,
});

const yoga = createYoga({
  schema,
  context: { pubsub },
  graphiql: {
    subscriptionsProtocol: "WS",
  },
});

const server = createServer(yoga);
const wsServer = new WebSocketServer({
  server: server,
  path: yoga.graphqlEndpoint,
});

useServer(
  {
    execute: (args) => args.rootValue.execute(args),
    subscribe: (args) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, _id, params) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } =
        yoga.getEnveloped({
          ...ctx,
          req: ctx.extra.request,
          socket: ctx.extra.socket,
          params,
        });

      const args = {
        schema,
        operationName: params.operationName,
        document: parse(params.query),
        variableValues: params.variables,
        contextValue: await contextFactory(),
        rootValue: {
          execute,
          subscribe,
        },
      };

      const errors = validate(args.schema, args.document);
      if (errors.length) return errors;
      return args;
    },
  },
  wsServer
);

server.listen(4000, () => {
  console.log(`http://localhost:4000/graphql`);
});
