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
    getUser(id: ID!): User
    getUsers: [User]
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
`;

const users: UserType[] = [];

const resolvers = {
  Query: {
    getUser: async (
      root: any,
      args: { id: string }
    ): Promise<UserType | null> => {
      const user = users.find((u) => u.id === args.id);
      return user || null;
    },
    getUsers: async (): Promise<UserType[]> => {
      return users;
    },
  },
  Mutation: {
    createUser: async (
      root: any,
      { input }: { input: UserType }
    ): Promise<UserType | null> => {
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
      return newUser;
    },
    updateUser: async (
      root: any,
      { id, input }: { id: string; input: UserType }
    ): Promise<UserType | null> => {
      const userIndex = users.findIndex((u) => u.id === id);
      if (userIndex !== -1) {
        const updatedUser: UserType = { ...users[userIndex], ...input };
        users[userIndex] = updatedUser;
        return updatedUser;
      }
      return null;
    },
    deleteUser: async (
      root: any,
      { id }: { id: string }
    ): Promise<UserType | null> => {
      const userIndex = users.findIndex((u) => u.id === id);
      if (userIndex !== -1) {
        const deletedUser = users.splice(userIndex, 1)[0];
        return deletedUser;
      }
      return null;
    },
  },
};

const app: FastifyInstance = Fastify().withTypeProvider<TypeBoxTypeProvider>();

// Route for GraphiQL
const mercuriusPlugin: FastifyPluginCallback = (instance, options, done) => {
  instance.register(mercurius, {
    schema,
    resolvers,
    graphiql: true,
    path: "/api/graphql",
  });
  done();
};

// Register mercurius plugin
app.register(mercuriusPlugin);

const start = async () => {
  try {
    const address = await app.listen({ port: 3000 });
    console.log(`Server is running on ${address}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
