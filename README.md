# Serverless Credentials Plugin

This is currently in beta! Feedback is very much welcome.

IMPORTANT NOTE: As pointed out in the [AWS documentation](http://docs.aws.amazon.com/lambda/latest/dg/env_variables.html) for storing sensible the `Ciphertext` should be stored in the environment variables. This tutorial doesn't go into that yet, but we will update it soon accordingly.

# Install

```bash
npm install --save-dev serverless-secrets-plugin
```

After that you need to add the plugin to your `serverless.yml` of you service.

Run the command `serverless --help` and verify the list of commands contain an `encrypt` and a `decrypt` command.

# Usage

Create a `secrets.{stage}.yml` file for each stage e.g. `secrets.dev.yml`.

Store the keys in there, that you want to keep private e.g.
```yml
EMAIL_SERVICE_API_KEY: DEV_API_EXAMPLE_KEY_12
SESSION_KEY: DEV_SESSION_EXAMPLE_KEY_12
```

You can also provide a path prefix if you like to keep your secrets in a different directory e.g.
```yml
custom:
  secretsFilePathPrefix: config
```

Encrypt the secrets file for the desired stage by running

```bash
serverless encrypt --stage dev --password '{your super secure password}'
```

This will result in an encrypted file e.g. `secrets.dev.yml.encrypted`. You can check the encrypted file into your version control system e.g. Git. It's recommened to add your unencrypted file to `.gitignore` or similar so you and your colleagues can't check it in by accident.

In your `serverless.yaml` you can use the file variable syntax to import the secrets and set them as environment variables. When you create or update Lambda functions that use environment variables, AWS Lambda encrypts them using the AWS Key Management Service. Read more about that in the AWS documentation [here](http://docs.aws.amazon.com/lambda/latest/dg/env_variables.html).

Whenever you want to deploy there needs to be the unencrypted version of the secrets file available otherwise the plugin will prevent the deployment.

# Example

You can check out a full example in the Serverless Examples repository: [serverless/examples/aws-node-env-variables-encrypted-in-a-file](https://github.com/serverless/examples/tree/master/aws-node-env-variables-encrypted-in-a-file).
