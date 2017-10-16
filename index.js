'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BbPromise = require('bluebird');

const algorithm = 'aes-256-cbc';

class ServerlessSecretsPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    if (this.serverless.service.custom && this.serverless.service.custom.secretsFilePathPrefix) {
      this.customPath = this.serverless.service.custom.secretsFilePathPrefix;
    } else {
      this.customPath = '';
    }

    const commandOptions = {
      stage: {
        usage: 'Stage of the file to encrypt',
        shortcut: 's',
        required: true,
      },
      password: {
        usage: 'Password to encrypt the file.',
        shortcut: 'p',
        required: true,
      },
    };

    this.commands = {
      encrypt: {
        usage: 'Encrypt a secrets file for a specific stage.',
        lifecycleEvents: [
          'encrypt',
        ],
        options: commandOptions,
      },
      decrypt: {
        usage: 'Decrypt a secrets file for a specific stage.',
        lifecycleEvents: [
          'decrypt',
        ],
        options: commandOptions,
      },
    };

    this.hooks = {
      'encrypt:encrypt': this.encrypt.bind(this),
      'decrypt:decrypt': this.decrypt.bind(this),
      'package:cleanup': this.checkFileExists.bind(this),
    };
  }

  encrypt() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const customPath = this.customPath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const encryptedCredentialFileName = `${credentialFileName}.encrypted`;
      const secretsPath = path.join(servicePath, customPath, credentialFileName);
      const encryptedCredentialsPath = path.join(servicePath, customPath, encryptedCredentialFileName);

      fs.createReadStream(secretsPath)
        .on('error', reject)
        .pipe(crypto.createCipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(encryptedCredentialsPath))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Successfully encrypted '${credentialFileName}' to '${encryptedCredentialFileName}'`);
          resolve();
        });
    });
  }

  decrypt() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const customPath = this.customPath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const encryptedCredentialFileName = `${credentialFileName}.encrypted`;
      const secretsPath = path.join(servicePath, customPath, credentialFileName);
      const encryptedCredentialsPath = path.join(servicePath, customPath, encryptedCredentialFileName);

      fs.createReadStream(encryptedCredentialsPath)
        .on('error', reject)
        .pipe(crypto.createDecipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(secretsPath))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Successfully decrypted '${encryptedCredentialFileName}' to '${credentialFileName}'`);
          resolve();
        });
    });
  }

  checkFileExists() {
    return new BbPromise((resolve, reject) => {
      const servicePath = this.serverless.config.servicePath;
      const customPath = this.customPath;
      const credentialFileName = `secrets.${this.options.stage}.yml`;
      const secretsPath = path.join(servicePath, customPath, credentialFileName);
      fs.access(secretsPath, fs.F_OK, (err) => {
        if (err) {
          reject(`Couldn't find the secrets file for this stage: ${credentialFileName}`);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = ServerlessSecretsPlugin;
