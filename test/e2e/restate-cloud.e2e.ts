import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as secrets from "aws-cdk-lib/aws-secretsmanager";
import "source-map-support/register";

import { EnvironmentId, RestateCloudEnvironment, ServiceDeployer } from "../../lib/restate-constructs";

// Deploy with: RESTATE_ENV_ID=env_... RESTATE_API_KEY=key_... npx cdk --app 'npx tsx restate-cloud.e2e.ts' deploy
const app = new cdk.App();
const stack = new cdk.Stack(app, "e2e-RestateCloud");

if (!process.env.RESTATE_ENV_ID || !process.env.RESTATE_API_KEY) {
  throw new Error("Please set RESTATE_ENV_ID and RESTATE_API_KEY");
}

const handler: lambda.Function = new lambda.Function(stack, "Service", {
  runtime: lambda.Runtime.NODEJS_LATEST,
  code: lambda.Code.fromAsset("../handlers/dist/"),
  handler: "bundle.handler",
});

const environment = new RestateCloudEnvironment(stack, "CloudEnv", {
  environmentId: process.env.RESTATE_ENV_ID! as EnvironmentId,
  apiKey: new secrets.Secret(stack, "RestateCloudApiKey", {
    secretStringValue: cdk.SecretValue.unsafePlainText(process.env.RESTATE_API_KEY!),
  }),
});

const deployer = new ServiceDeployer(stack, "ServiceDeployer", {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  entry: "../../dist/register-service-handler/index.js", // only for tests
});

deployer.deployService("Greeter", handler.currentVersion, environment);

new cdk.CfnOutput(stack, "RestateIngressUrl", { value: environment.ingressUrl });

app.synth();