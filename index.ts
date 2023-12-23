import fastify from "fastify";

const server = fastify();

interface IQuerystring {
  username: string;
  password: string;
}

interface IHeaders {
  "h-Custom": string;
}

interface IReply {
  200: { success: boolean; message: string };
  302: { url: string };
  "4xx": { error: string };
}

server.get("/ping", async (request, reply) => {
  return "pong\n";
});

server.get<{
  Querystring: IQuerystring;
  Headers: IHeaders;
  Reply: IReply;
}>(
  "/auth",
  {
    preValidation: (request, reply, done) => {
      const { username, password } = request.query;
      done(username !== "admin" ? new Error("Must be admin") : undefined); // only validate `admin` account
    },
  },
  async (request, reply) => {
    try {
      const { username, password } = request.query;
      const customerHeader = request.headers["h-Custom"];
      // do something with request data

      // chaining .statusCode/.code calls with .send allows type narrowing. For example:
      // this works
      reply.code(200).send({ success: true, message: "logged in!" });
      // but this gives a type error
      // reply.code(200).send('uh-oh');
      // it even works for wildcards
      //   reply.code(404).send({ error: "Not found" });
      //   return `logged in!`;
    } catch (err) {
      console.log("ERROR: ", err);
      reply.code(404).send({ error: "Not found" });
    }
  }
);

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
