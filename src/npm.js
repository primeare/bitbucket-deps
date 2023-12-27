import semver from 'semver';

export class NPM {
  packageJSON;
  packageLockJSON;

  constructor(packageJSON, packageLockJSON) {
    this.packageJSON = packageJSON;
    this.packageLockJSON = packageLockJSON;
    this.packagesList = [
      ...Object.keys(packageJSON.dependencies ?? []),
      ...Object.keys(packageJSON.devDependencies ?? []),
    ];
  }

  getPackageVersion(name) {
    return this.packageLockJSON.packages[`node_modules/${name}`].version;
  }

  updatePackageVersion(name, version) {
    if (name in this.packageJSON.dependencies) {
      this.packageJSON.dependencies[name] = version;
    } else if (name in this.packageJSON.devDependencies) {
      this.packageJSON.devDependencies[name] = version;
    }

    this.packageLockJSON.packages[`node_modules/${name}`].version = version;

    return true;
  }

  static isValidVersion(version) {
    return semver.valid(version);
  }

  static isNewerVersion(newVersion, oldVersion) {
    return semver.gt(newVersion, oldVersion);
  }
}
