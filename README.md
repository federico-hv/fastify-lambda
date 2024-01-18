# fastify-lambda

This repository serves as a default starting project for building serverless functions (lambdas) on Netlify using Fastify and TypeScript. It provides a convenient setup for local development and deployment on the Netlify platform.

#### Getting Started

To run this project locally, follow these steps:

**1. Clone the repository:**

```bash
git clone https://github.com/your-username/fastify-lambda.git
```

**2. Navigate to the project directory:**

```bash
cd fastify-lambda
```

**3. Install dependencies:**

```bash
yarn install
```

# Local Development

#### Run Locally with TypeScript Server

You can run the project locally using the following command:

```bash
yarn dev
```

This will start a TypeScript server on port 3000, watching the `service.ts` TypeScript file for changes during local development.

#### Run Locally with Netlify CLI

Alternatively, you can use the Netlify CLI for local development:

```bash
yarn netlify-dev
```

This command leverages the Netlify CLI to start a server on port 8888.

#### Transpile Typescript to Javascript

You can build the javascript file locally. The output will be a `lambda/service.js` file

```bash
yarn build
```

You can serve this file locally with `yarn start`. It's good to notice that we are adding this command to the `netlify.toml` file to be executed on deploy.

## Missing parts

Subscriptions aren't still working at least on GraphiQL and it seems this is a reported issue but will add them once I figure it out.

## Endpoints

- GraphQL simple in-memory API: `/.netlify/functions/service/graphql`
- GraphiQL Interface: `/.netlify/functions/service/graphiql`
- Health Check: `/.netlify/functions/service/ping`

Feel free to customize and extend these endpoints to suit your specific requirements.

Happy coding! 🚀
