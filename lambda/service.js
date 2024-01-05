import Fastify from "fastify";
import mercurius from "mercurius";
import { Type } from "@sinclair/typebox";
import { PubSub } from "graphql-subscriptions";
import awsLambdaFastify from "@fastify/aws-lambda";
export const pubsub = new PubSub();
// Define the User model using @sinclair/typebox
const User = Type.Object({
    id: Type.String(),
    firstname: Type.String(),
    lastname: Type.String(),
    email: Type.String({ format: "email" }),
    age: Type.Integer({ minimum: 0 }),
    profession: Type.String(),
});
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
const users = [];
const resolvers = {
    Query: {
        user: async (root, args) => {
            const user = users.find((u) => u.id === args.id);
            return user || null;
        },
        users: async () => {
            return users;
        },
    },
    Mutation: {
        createUser: async (root, { input }) => {
            // Validation is already performed by Fastify using UserType
            const newUser = {
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
        updateUser: async (root, { id, input }) => {
            const userIndex = users.findIndex((u) => u.id === id);
            if (userIndex !== -1) {
                const updatedUser = Object.assign(Object.assign({}, users[userIndex]), input);
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
        deleteUser: async (root, { id }) => {
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
export const app = Fastify().withTypeProvider();
// Route for GraphiQL and GraphQL
const mercuriusPlugin = (instance, options, done) => {
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
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
};
start();
const proxy = awsLambdaFastify(app);
export const handler = async (event, context) => {
    await app.ready();
    return proxy(event, context);
};
