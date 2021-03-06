import fs from 'fs';
import os from 'os';
import path from 'path';
import util from 'util';
import async from 'async';
import mkdirp from 'mkdirp';
import walk from 'fs-walk';
import osenv from 'osenv';
import urlJoin from 'url-join';
import _ from 'underscore';
import ipc from 'ipc';

import DockerUtil from './DockerUtil';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

function normalize(contentID) {
  if (contentID.endsWith("/")) {
    return contentID;
  }
  return contentID + "/";
}

var lastID = 0;
let repositoriesPath = path.join(osenv.home(), '.deconst', 'repositories.json');

const DEFAULT_CONTENT_ID_BASE = 'local-content/';
const DEFAULT_SITE = 'local.site.horse';

function validateDirectory(dir, allOf, callback) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return callback(null, [`${dir} does not exist.`]);
      }

      if (err.code === 'ENOTDIR') {
        return callback(null, [`${dir} is not a directory.`]);
      }

      if (err.code === 'EACCES') {
        return callback(null, [`${dir} is not readable.`]);
      }

      return callback(err);
    }

    let allOfPaths = allOf.map((fname) => path.join(dir, fname));

    let isReadable = (p, cb) => {
      fs.access(p, fs.R_OK, (err) => cb(err === null));
    };

    async.reject(allOfPaths, isReadable, (missing) => {
      let errors = missing.map((fpath) => `${path.basename(fpath)} can't be found.`);

      callback(null, errors || []);
    });
  });
}

export function validateContentRepository({displayName, controlRepositoryLocation, contentRepositoryPath, preparer}, callback) {
  async.parallel({
    displayName: (cb) => {
      if (displayName !== null && displayName.length === 0) {
        return cb(null, ["Please specify a nonempty display name."]);
      }

      cb(null, []);
    },
    controlRepositoryLocation: (cb) => {
      if (controlRepositoryLocation === null) {
        return cb(null, []);
      }

      validateDirectory(controlRepositoryLocation, ['package.json', 'Gruntfile.js'], (err, results) => {
        if (err) return cb(err);

        if (results.length > 0) {
          results[0] = `This doesn't look like a content repository; ${results[0]}`;
        }

        cb(null, results);
      });
    },
    contentRepositoryPath: (cb) => {
      if (contentRepositoryPath === null) {
        return cb(null, []);
      }

      let allOf = (preparer === 'sphinx') ? ['conf.py'] : ['_config.yml'];

      validateDirectory(contentRepositoryPath, allOf, (err, results) => {
        if (err) return cb(err);

        if (results.length > 0) {
          results[0] = `This doesn't look like a ${preparer} repository: ${results[0]}`;
          results.push("Try changing the preparer type or specifying a different path.");
        }

        cb(null, results);
      });
    }
  }, callback);
}

export function availableTemplates (controlRepositoryLocation, site, callback) {
  // End the root path with a / so the slice works properly.
  let templateRoot = path.join(controlRepositoryLocation, "templates", site) + '/';
  let templatePaths = [];

  walk.files(templateRoot, (basedir, filename, stat, next) => {
    let relativeDirPath = basedir.slice(templateRoot.length);

    if (relativeDirPath.startsWith('_')) {
      return next();
    }

    let templatePath = path.join(relativeDirPath, filename);
    templatePaths.push(templatePath);

    next();
  }, (err) => {
    if (err) return callback(err);

    callback(null, templatePaths);
  });
};

function interpretMaps(deconstConfig, contentMap, routesMap) {
  let contentIDBase = DEFAULT_CONTENT_ID_BASE;
  let site = null;
  let prefix = "/";
  let templateRoutes = routesMap;
  let isMapped = false;

  if (deconstConfig !== null) {
    contentIDBase = normalize(deconstConfig.contentIDBase);
  }

  let sites = Object.keys(contentMap);

  sites.forEach((eachSite) => {
    let siteMap = contentMap[eachSite].content || {};
    let matchingPrefix = _.findKey(siteMap, (id) => normalize(id) === contentIDBase);

    if (matchingPrefix !== undefined && ! site) {
      site = eachSite;
      prefix = matchingPrefix;
      isMapped = true;
    }
  });

  // Map to the first site in the conf file, if any are available, so that you at least have
  // a default template to render with.
  if (! site) {
    if (sites.length > 0) {
      site = sites[0];
    } else {
      site = DEFAULT_SITE;
    }
  }

  // Ensure that the template route map contains, at least, the site that we're rendering.
  if (! templateRoutes[site]) {
    templateRoutes[site] = {routes: {}};
  }

  return {contentIDBase, site, prefix, templateRoutes, isMapped};
};

export function readMaps(contentRepositoryPath, controlRepositoryLocation, callback) {
  let deconstConfigPath = path.join(contentRepositoryPath, '_deconst.json');
  let configRoot = path.join(controlRepositoryLocation, 'config');
  let contentMapPath = path.join(configRoot, 'content.json');
  let templateMapPath = path.join(configRoot, 'routes.json');

  let jsonDefaultingTo = (p, def) => (cb) => {
    fs.readFile(p, {encoding: 'utf-8'}, (err, data) => {
      if (err) {
        if (err.code !== 'ENOENT') {
          return cb(err);
        }

        return cb(null, def);
      }

      let parsed = def;

      try {
        parsed = JSON.parse(data);
      } catch (e) {};

      cb(null, parsed);
    });
  };

  async.parallel({
    deconstConfig: jsonDefaultingTo(deconstConfigPath, null),
    contentMap: jsonDefaultingTo(contentMapPath, {}),
    templateMap: jsonDefaultingTo(templateMapPath, {})
  }, (err, results) => {
    if (err) return callback(err);

    callback(null, interpretMaps(results.deconstConfig, results.contentMap, results.templateMap));
  });
};

export function readMapsSync(contentRepositoryPath, controlRepositoryLocation) {
  let deconstConfig = null;
  let contentMap = {};
  let templateMap = {};

  try {
    deconstConfig = JSON.parse(fs.readFileSync(path.join(contentRepositoryPath, '_deconst.json')));
  } catch (err) {};

  try {
    contentMap = JSON.parse(fs.readFileSync(path.join(controlRepositoryLocation, 'config', 'content.json')));
  } catch (err) {};

  try {
    templateMap = JSON.parse(fs.readFileSync(path.join(controlRepositoryLocation, 'config', 'routes.json')));
  } catch (err) {};

  return interpretMaps(deconstConfig, contentMap, templateMap);
};

export class ContentRepository {

  constructor (id, displayName, controlRepositoryLocation, contentRepositoryPath, preparer, template) {
    this.id = id || lastID++;
    this.displayName = displayName;
    this.controlRepositoryLocation = controlRepositoryLocation;
    this.contentRepositoryPath = contentRepositoryPath;
    this.preparer = preparer;
    this.template = template;

    this.state = "launching";
    this.hasPrepared = false;

    this.contentContainer = null;
    this.presenterContainer = null;
    this.contentPreparerContainer = null;
    this.controlPreparerContainer = null;

    this.contentWatcher = null;
    this.controlWatcher = null;

    if (this.id > lastID) {
      lastID = this.id + 1;
    }

    // Read the control repository configuration maps.
    let result = readMapsSync(this.contentRepositoryPath, this.controlRepositoryLocation);

    this.contentIDBase = result.contentIDBase;
    this.site = result.site;
    this.prefix = result.prefix;
    this.templateRoutes = result.templateRoutes;
    this.isMapped = result.isMapped;

    // Inject the template selection if necessary.
    if (!this.isMapped && this.template) {
      this.templateRoutes[this.site] = {routes: {}}
      this.templateRoutes[this.site].routes[`^${this.prefix}.*`] = this.template;
    }
  }

  name () {
    return this.displayName || path.basename(this.contentRepositoryPath);
  }

  _containerURL(container, ...rest) {
    if (!container) {
      return "";
    }

    let host = DockerUtil.host;
    let port = container.NetworkSettings.Ports['8080/tcp'][0].HostPort;

    return urlJoin("http://" + host + ":" + port + "/", ...rest);
  }

  publicURL() {
    return this._containerURL(this.presenterContainer, this.prefix);
  }

  contentURL() {
    return this._containerURL(this.contentContainer);
  }

  canSubmit() {
    let hasContentContainer = !! this.contentContainer;
    let isReady = this.state === "ready" || this.state === "preparing";

    return hasContentContainer && isReady;
  }

  canPreview() {
    let hasPresenterContainer = !! this.presenterContainer;

    return hasPresenterContainer && this.hasPrepared;
  }

  isPreparing() {
    let isPreparingContent = !! this.contentPreparerContainer;
    let isPreparingControl = !! this.controlPreparerContainer;

    return isPreparingContent || isPreparingControl;
  }

  containerIds() {
    let ids = [];

    if (this.contentContainer) {
      ids.push(this.contentContainer.Id);
    }

    if (this.presenterContainer) {
      ids.push(this.presenterContainer.Id);
    }

    if (this.contentPreparerContainer) {
      ids.push(this.contentPreparerContainer.Id);
    }

    if (this.controlPreparerContainer) {
      ids.push(this.controlPreparerContainer.Id);
    }

    return ids;
  }

  serialize() {
    return {
      id: this.id,
      displayName: this.displayName,
      controlRepositoryLocation: this.controlRepositoryLocation,
      contentRepositoryPath: this.contentRepositoryPath,
      preparer: this.preparer
    };
  }

  reportPreparerComplete(container) {
    let preparerName;

    if (this.contentPreparerContainer && this.contentPreparerContainer.Id === container.Id) {
      this.contentPreparerContainer = null;
      preparerName = "content";
    }

    if (this.controlPreparerContainer && this.controlPreparerContainer.Id === container.Id) {
      this.controlPreparerContainer = null;
      preparerName = "control";
    }

    if (!preparerName) {
      return;
    }

    if (container.State.ExitCode === 0) {
      // Clean exit. Hooray!
      if (!this.isPreparing()) {
        this.state = "ready";
        this.hasPrepared = true;
        ipc.send('deconst:preparer-completion');
      }
    } else if (container.State.ExitCode === 137) {
      // Killed, presumably to run a new preparer.
    } else {
      // Boom! Something went wrong.
      this.reportError(`The ${preparerName} preparer exited with status ${container.State.ExitCode}.`);
    }
  }

  reportError(message) {
    this.state = "error";
    this.error = message;
  }

};

export default {

  launchServicePod (repo) {
    let contentMap = {};
    contentMap[repo.site] = { content: {}, proxy: {} };
    contentMap[repo.site].content[repo.prefix] = repo.contentIDBase;
    contentMap[repo.site].proxy["/__local_asset__/"] = "http://content:8080/assets/";

    let templateRoutes = repo.templateRoutes;

    let controlOverrideDir = path.join(osenv.home(), '.deconst', 'control-' + repo.id);
    let mapOverridePath = path.join(controlOverrideDir, 'content.json');
    let templateOverridePath = path.join(controlOverrideDir, 'routes.json');

    let contentParams = {
      Env: [
        "NODE_ENV=development",
        "STORAGE=memory",
        "ADMIN_APIKEY=supersecret",
        "CONTENT_LOG_LEVEL=debug",
        "CONTENT_LOG_COLOR=true"
      ],
      HostConfig: {
        PublishAllPorts: true,
        ReadonlyRootfs: true
      }
    };

    let presenterParams = {
      Volumes: {
        "/var/control-repo": {},
        "/var/override": {}
      },
      Env: [
        "NODE_ENV=development",
        "CONTROL_REPO_PATH=/var/control-repo",
        "CONTROL_CONTENT_FILE=/var/override/content.json",
        "CONTROL_ROUTES_FILE=/var/override/routes.json",
        "CONTENT_SERVICE_URL=http://content:8080/",
        "PRESENTER_LOG_LEVEL=debug",
        "PRESENTER_LOG_COLOR=true",
        "PRESENTED_URL_DOMAIN=" + repo.site,
      ],
      HostConfig: {
        Binds: [
          repo.controlRepositoryLocation + ':/var/control-repo',
          controlOverrideDir + ':/var/override:ro'
        ],
        Links: [ "content-" + repo.id + ":content" ],
        PublishAllPorts: true,
        ReadonlyRootfs: true
      }
    };

    async.series([
      (cb) => mkdirp(controlOverrideDir, cb),
      (cb) => fs.writeFile(mapOverridePath, JSON.stringify(contentMap), cb),
      (cb) => fs.writeFile(templateOverridePath, JSON.stringify(templateRoutes), cb),
      (cb) => {
        DockerUtil.run("content-" + repo.id, "quay.io/deconst/content-service", "latest", contentParams, cb);
      },
      (cb) => {
        DockerUtil.run("presenter-" + repo.id, "quay.io/deconst/presenter", "latest", presenterParams, cb);
      }
    ], (error, results) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      let contentContainer = results[results.length - 2];
      let presenterContainer = results[results.length - 1];

      ContentRepositoryActions.podLaunched({repo, contentContainer, presenterContainer});
    });
  },

  launchContentPreparer (repo) {
    let params = {
      Volumes: {
        "/usr/control-repo": {}
      },
      Env: [
        "CONTENT_STORE_URL=" + repo.contentURL(),
        "CONTENT_STORE_APIKEY=supersecret",
        "CONTENT_ID_BASE=" + repo.contentIDBase,
        "TRAVIS_PULL_REQUEST=false"
      ],
      HostConfig: {
        Binds: [repo.contentRepositoryPath + ":/usr/content-repo"],
        ReadonlyRootfs: true
      }
    };

    DockerUtil.run("preparer-content-" + repo.id, "quay.io/deconst/preparer-" + repo.preparer, "latest", params, (error, container) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      ContentRepositoryActions.contentPreparerLaunched({repo, container});
    })
  },

  launchControlPreparer (repo) {
    let params = {
      Volumes: {
        "/var/control-repo": {}
      },
      Env: [
        "CONTENT_STORE_URL=" + repo.contentURL(),
        "CONTENT_STORE_APIKEY=supersecret",
        "TRAVIS_PULL_REQUEST=false"
      ],
      HostConfig: {
        Binds: [repo.controlRepositoryLocation + ":/var/control-repo"],
        ReadonlyRootfs: true
      }
    };

    DockerUtil.run("preparer-control-" + repo.id, "quay.io/deconst/preparer-asset", "latest", params, (error, container) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      ContentRepositoryActions.controlPreparerLaunched({repo, container});
    })
  },

  relaunchContainers (repo) {
    DockerUtil.cleanContainers(repo.containerIds(), (error) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      this.launchServicePod(repo);
    });
  },

  cleanContainers (repo) {
    DockerUtil.cleanContainers(repo.containerIds(), (error) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }
    });
  },

  saveRepositories (repos) {
    let orderedRepos = _.sortBy(_.values(repos), r => r.id);
    let serializedRepos = _.map(orderedRepos, r => r.serialize());

    fs.writeFile(repositoriesPath, JSON.stringify(serializedRepos), {encoding: 'utf-8'}, (error) => {
      if (error) {
        console.error(error);
      }
    });
  },

  loadRepositories (callback) {
    fs.readFile(repositoriesPath, {encoding: 'utf-8'}, (error, data) => {
      if (error) {
        if (error.code !== 'ENOENT') {
          console.error("Unable to open repository file: " + util.inspect(error));
        }

        return callback(null);
      }

      try {
        JSON.parse(data).forEach((repoDoc) => {
          let wellFormed = (repoDoc.id !== undefined);
          wellFormed = wellFormed && (repoDoc.controlRepositoryLocation !== undefined);
          wellFormed = wellFormed && (repoDoc.contentRepositoryPath !== undefined);
          wellFormed = wellFormed && (repoDoc.preparer !== undefined);

          if (wellFormed) {
            ContentRepositoryActions.launch(
              repoDoc.id,
              repoDoc.displayName || null,
              repoDoc.controlRepositoryLocation,
              repoDoc.contentRepositoryPath,
              repoDoc.preparer
            );
          } else {
            console.log("Malformed repository document: " + util.inspect(repoDoc));
          }
        })
      } catch (e) {
        console.error("Unable to parse repository file: " + util.inspect(e));
      }

      callback(null);
    })
  }

};
