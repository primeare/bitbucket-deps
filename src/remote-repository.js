import bitbucket from 'bitbucket';

export class BitBucketClient {
  #bitbucketClient;
  workspace;
  repositorySlug;

  constructor({ token, repositoryURL }) {
    this.#bitbucketClient = new bitbucket.Bitbucket({
      auth: { token },
      request: { fetch, timeout: 10 },
    });

    const parts = repositoryURL.split('/');

    this.workspace = parts[3];
    this.repositorySlug = parts[4];
  }

  async getMainBranchName() {
    try {
      const { data } = await this.#bitbucketClient.repositories.get({
        workspace: this.workspace,
        repo_slug: this.repositorySlug,
      });

      if (data == null || data.mainbranch == null) {
        throw new Error('Cannot retrieve main branch name');
      }

      return data.mainbranch.name;
    } catch (error) {
      console.error('Cannot retrieve main branch name');
      throw error;
    }
  }

  async getLatestCommitHash() {
    try {
      const { data } = await this.#bitbucketClient.repositories.listCommits({
        workspace: this.workspace,
        repo_slug: this.repositorySlug,
      });

      if (data.values == null || data.values.length < 1) {
        throw new Error('No commits in the repository. Cannot perform update');
      }

      return data.values[0].hash;
    } catch (error) {
      console.error('Cannot retrieve latest commit');
      throw error;
    }
  }

  async commit({ files, branch, message }) {
    try {
      const preparedFiles = Object.entries(files).reduce((collector, file) => {
        const [fileName, contents ] = file;

        collector[fileName] = typeof contents === 'object' ?
          JSON.stringify(contents, null, 2) + '\n' :
          contents;

        return collector;
      }, {});

      const { data } = await this.#bitbucketClient.source.createFileCommit({
        workspace: this.workspace,
        repo_slug: this.repositorySlug,
        _body: {
          ...preparedFiles,
          branch,
          message,
        },
      });

      return data;
    } catch (error) {
      console.error('Cannot create new commit');
      throw error;
    }
  }

  async createPullRequest({ sourceBranch, destinationBranch, title }) {
    try {
      const { data } = await this.#bitbucketClient.pullrequests.create({
        workspace: this.workspace,
        repo_slug: this.repositorySlug,
        _body: {
          type: 'string',
          title,
          destination: { branch: { name: destinationBranch } },
          source: { branch: { name: sourceBranch } },
        },
      });

      return data.links?.html?.href;
    } catch (error) {
      console.error('Cannot create new pull request');
      throw error;
    }
  }

  async readFile(filePath, commitHash) {
    try {
      const { data } = await this.#bitbucketClient.source.read({
        commit: commitHash,
        workspace: this.workspace,
        repo_slug: this.repositorySlug,
        path: filePath,
      });

      if (filePath.endsWith('json')) {
        return JSON.parse(data);
      }

      return data;
    } catch (error) {
      console.error(`Cannot read "${filePath}" in repository`);
      throw error;
    }
  }
}
