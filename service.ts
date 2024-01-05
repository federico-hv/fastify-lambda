import Fastify, {
  FastifyInstance,
  FastifyPluginCallback,
  RouteShorthandOptions,
  FastifyReply,
  FastifyRequest,
  RouteShorthandOptionsWithHandler,
} from "fastify";
import mercurius from "mercurius";
import { Type, Static } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { PubSub } from "graphql-subscriptions";
import awsLambdaFastify from "@fastify/aws-lambda";

export const pubsub = new PubSub();

interface PubSubObject {
  pubsub: PubSub;
}
// Define the User model using @sinclair/typebox
const User = Type.Object({
  id: Type.String(),
  firstname: Type.String(),
  lastname: Type.String(),
  email: Type.String({ format: "email" }),
  age: Type.Integer({ minimum: 0 }),
  profession: Type.String(),
});

// Create a TypeScript type based on the schema
type UserType = Static<typeof User>;

const schema = `
  type User {
    id: ID!
    firstname: String!
    lastname: String!
    email: String!
    age: Int!
    profession: String!
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(input: UserInput): User
    updateUser(id: ID!, input: UserInput): User
    deleteUser(id: ID!): User
  }

  input UserInput {
    firstname: String!
    lastname: String!
    email: String!
    age: Int!
    profession: String!
  }

  type Subscription {
    users: [User]
  }
`;

const users: UserType[] = [];

const resolvers = {
  Query: {
    user: async (root: any, args: { id: string }): Promise<UserType | null> => {
      const user = users.find((u) => u.id === args.id);
      return user || null;
    },
    users: async (): Promise<UserType[]> => {
      return users;
    },
  },
  Mutation: {
    createUser: async (
      root: any,
      { input }: { input: UserType }
    ): // { pubsub }: PubSubObject
    Promise<UserType | null> => {
      // Validation is already performed by Fastify using UserType
      const newUser: UserType = {
        id: String(users.length + 1),
        firstname: input.firstname,
        lastname: input.lastname,
        email: input.email,
        age: input.age,
        profession: input.profession,
      };
      users.push(newUser);

      // Publish the userAdded event for subscriptions
      pubsub.publish("users", {
        users,
      });
      // pubsub.publish({
      //   topic: "users",
      //   payload: {
      //     users: users,
      //   },
      // });

      return newUser;
    },
    updateUser: async (
      root: any,
      { id, input }: { id: string; input: UserType }
    ): // { pubsub }: PubSubObject
    Promise<UserType | null> => {
      const userIndex = users.findIndex((u) => u.id === id);
      if (userIndex !== -1) {
        const updatedUser: UserType = { ...users[userIndex], ...input };
        users[userIndex] = updatedUser;

        pubsub.publish("users", {
          users,
        });
        // pubsub.publish({
        //   topic: "users",
        //   payload: {
        //     users: users,
        //   },
        // });

        return updatedUser;
      }
      return null;
    },
    deleteUser: async (
      root: any,
      { id }: { id: string }
    ): // { pubsub }: PubSubObject
    Promise<UserType | null> => {
      const userIndex = users.findIndex((u) => u.id === id);
      if (userIndex !== -1) {
        const deletedUser = users.splice(userIndex, 1)[0];

        // Publish the userAdded event for subscriptions
        // pubsub.publish({
        //   topic: "users",
        //   payload: {
        //     users: users,
        //   },
        // });
        pubsub.publish("users", {
          users,
        });

        return deletedUser;
      }
      return null;
    },
  },
  Subscription: {
    users: {
      // subscribe: (root: any, args: any, { pubsub }: any) => {
      //   return pubsub.subscribe("users");
      // },
      subscribe: async () => await pubsub.asyncIterator("users"),
    },
  },
};

export const app: FastifyInstance =
  Fastify().withTypeProvider<TypeBoxTypeProvider>();

// Route for GraphiQL and GraphQL
const mercuriusPlugin: FastifyPluginCallback = (instance, options, done) => {
  instance.register(mercurius, {
    prefix: "/.netlify/functions/service",
    schema,
    resolvers,
    graphiql: true,
    path: "/api/graphql",
    subscription: true, // Enable WebSocket subscriptions
  });
  done();
};

// Declare a route
app.route({
  method: "GET",
  url: "/.netlify/functions/service/ping",
  handler: async function (request, reply) {
    return { message: "pong!" };
  },
});

// Register mercurius plugin
app.register(mercuriusPlugin);

const start = async () => {
  try {
    await app.listen({ port: 3000 });

    console.log(`Server is running on http://localhost:3000`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();

const proxy = awsLambdaFastify(app);

export const handler = async (event: any, context: any) => {
  await app.ready();
  return proxy(event, context);
};
