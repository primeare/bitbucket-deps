#!/usr/bin/env node

import enquirer from 'enquirer';
import { parseArgs } from 'node:util';
import { NPM } from './npm.js';
import { BitBucketClient } from './remote-repository.js';

const bitbucketURLRegExp = /https:\/\/bitbucket\.org\/[^/]+\/[^/]+\/?/gm;

const { values: cliArguments } = parseArgs({
  strict: true,
  options: {
    token: {
      type: 'string',
      short: 't',
    },
  },
});

const setupQuestions = [
  {
    type: 'input',
    name: 'repositoryURL',
    message: 'URL of BitBucket repository',
    validate(value) {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Invalid input: a non-empty string is expected';
      }

      if (!bitbucketURLRegExp.test(value)) {
        return 'Invalid input: a valid BitBucket repository URL is ' +
          'expected in form https://bitbucket.org/{workspace}/{repository}/';
      }

      return true;
    },
  },
];

if (cliArguments.token === undefined) {
  setupQuestions.unshift({
    type: 'invisible',
    name: 'token',
    message: 'Repository/Project/Workspace Access Token',
    validate(value) {
      if (typeof value !== 'string' || value.length === 0) {
        return 'Invalid input: a non-empty string is expected';
      }

      return true;
    },
  });
}

const setupAnswers = await enquirer.prompt(setupQuestions);

const bitbucketClient = new BitBucketClient({
  token: cliArguments.token ?? setupAnswers.token,
  repositoryURL: setupAnswers.repositoryURL,
});

const [mainBranchName, latestCommitHash] = await Promise.all([
  bitbucketClient.getMainBranchName(),
  bitbucketClient.getLatestCommitHash(),
]);

const [packageJSON, packageLockJSON] = await Promise.all([
  bitbucketClient.readFile('package.json', latestCommitHash),
  bitbucketClient.readFile('package-lock.json', latestCommitHash),
]);

const npm = new NPM(packageJSON, packageLockJSON);

const { packageToUpdate } = await enquirer.prompt({
  type: 'select',
  name: 'packageToUpdate',
  message: 'Which package do you want to update?',
  choices: npm.packagesList,
});

const currentPackageVersion = npm.getPackageVersion(packageToUpdate);

const { intendedNewVersion } = await enquirer.prompt({
  type: 'input',
  name: 'intendedNewVersion',
  message: 'What version do you want to update to? ' +
    `(current version: ${currentPackageVersion})`,
  validate(value) {
    if (!NPM.isValidVersion(value)) {
      return 'Invalid input: version must follow semver format (ex. X.X.X)';
    }

    if (!NPM.isNewerVersion(value, currentPackageVersion)) {
      return 'Invalid input: version must be greater than the current version';
    }

    return true;
  },
});

npm.updatePackageVersion(packageToUpdate, intendedNewVersion);

const branchName = `deps/${packageToUpdate}-${intendedNewVersion}`;
const commitMessage = `Update "${packageToUpdate}" to v${intendedNewVersion}`;
const prTitle = `Update \`${packageToUpdate}\` to v${intendedNewVersion}`;

await bitbucketClient.commit({
  branch: branchName,
  message: commitMessage,
  files: {
    'package.json': npm.packageJSON,
    'package-lock.json': npm.packageLockJSON,
  },
});

const prURL = await bitbucketClient.createPullRequest({
  sourceBranch: branchName,
  destinationBranch: mainBranchName,
  title: prTitle,
});

console.log(`Pull Request is created, visit: ${prURL}`);
