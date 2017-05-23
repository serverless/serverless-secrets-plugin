'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const BbPromise = require('bluebird');

const algorithm = 'aes-256-cbc';

class ServerlessPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;

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
      'before:deploy:cleanup': this.checkFileExists.bind(this),
    };
  }

  /**
   * Retrieve a nested value from an object using an array of path values
   * Return null in the case of a non-existent path
   * As described at https://medium.com/javascript-inside/safely-accessing-deeply-nested-values-in-javascript-99bf72a0855a
   * @param p
   * @param o
   */
  getNested (p, o) {
    return p.reduce((xs, x) => (xs && xs[x]) ? xs[x] : null, o)
  }

  /**
   * Use a dot-delimited string to access properties of this.serverless.service.custom
   * @param key
   * @returns {*}
   */
  getConfig(key) {
    return this.getNested(key.split('.'), this.serverless.service.custom)
  }

  /**
   * Return an object populated with paths to the credentials
   * @returns {{secrets: string, encrypted: string}}
   */
  getCredentialPaths() {
    const servicePath = this.serverless.config.servicePath;
    const credentialFileName = `secrets.${this.options.stage}.yml`;
    const encryptedCredentialFileName = `${credentialFileName}.encrypted`;
    const config = this.getConfig('pluginConfig.secrets')

    return {
      secrets:   path.join(servicePath, config.localPath, credentialFileName),
      encrypted: path.join(servicePath, config.localPath, encryptedCredentialFileName)
    }
  }

  encrypt() {
    const credentialPaths = this.getCredentialPaths()

    return new BbPromise((resolve, reject) => {
      fs.createReadStream(credentialPaths.secrets)
        .on('error', reject)
        .pipe(crypto.createCipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(credentialPaths.encrypted))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Sucessfully encrypted '${path.basename(credentialPaths.secrets)}' to '${path.basename(credentialPaths.encrypted)}'`);
          resolve();
        });
    });
  }

  decrypt() {
    const credentialPaths = this.getCredentialPaths()

    return new BbPromise((resolve, reject) => {
      fs.createReadStream(credentialPaths.encrypted)
        .on('error', reject)
        .pipe(crypto.createDecipher(algorithm, this.options.password))
        .on('error', reject)
        .pipe(fs.createWriteStream(credentialPaths.secrets))
        .on('error', reject)
        .on('close', () => {
          this.serverless.cli.log(`Sucessfully decrypted '${path.basename(credentialPaths.encrypted)}' to '${path.basename(credentialPaths.secrets)}'`);
          resolve();
        });
    });
  }

  checkFileExists() {
    const credentialPaths = this.getCredentialPaths()

    return new BbPromise((resolve, reject) => {
      fs.access(credentialPaths.secrets, fs.F_OK, (err) => {
        if (err) {
          reject(`Couldn't find the secrets file for this stage: ${path.basename(credentialPaths.secrets)} (looking in ${path.dirname(credentialPaths.secrets)})`);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = ServerlessPlugin;
