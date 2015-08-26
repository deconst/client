import fs from 'fs';
import os from 'os';
import path from 'path';
import async from 'async';
import mkdirp from 'mkdirp';
import osenv from 'osenv';
import urlJoin from 'url-join';
import _ from 'underscore';

import DockerUtil from './DockerUtil';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

function normalize(contentID) {
  if (contentID.endsWith("/")) {
    return contentID;
  }
  return contentID + "/";
}

var lastID = 0;

export class ContentRepository {

  constructor (controlRepositoryLocation, contentRepositoryPath, preparer, id = null) {
    this.id = id || lastID++;
    this.controlRepositoryLocation = controlRepositoryLocation;
    this.contentRepositoryPath = contentRepositoryPath;
    this.state = "launching";
    this.preparer = preparer;

    this.contentContainer = null;
    this.presenterContainer = null;
    this.contentPreparerContainer = null;
    this.controlPreparerContainer = null;

    // Parse the _deconst.json file to determine the content ID base.
    try {
      let deconstJSON = JSON.parse(
        fs.readFileSync(path.join(this.contentRepositoryPath, '_deconst.json'))
      );

      this.contentIDBase = normalize(deconstJSON.contentIDBase);
    } catch (err) {
      console.error(err);
    }

    if (! this.contentIDBase) {
      this.contentIDBase = 'https://content-id-base/';
    }

    let configRoot = path.join(this.controlRepositoryLocation, 'config');

    // Parse the content map from the control repository. Determine:
    // * The first site that contains the content ID.
    // * The subpath that the content ID is mapped to.
    try {
      let contentMap = JSON.parse(fs.readFileSync(path.join(configRoot, 'content.json')));

      Object.keys(contentMap).forEach((site) => {
        let siteMap = contentMap[site].content || {};
        let prefix = _.findKey(siteMap, (id) => normalize(id) === this.contentIDBase);

        if (prefix !== undefined && ! this.site) {
          this.site = site;
          this.prefix = prefix;
        }
      });
    } catch (err) {
      console.error(err);
    }

    if (! this.site) {
      this.site = 'local.deconst.horse';
    }

    if (! this.prefix) {
      this.prefix = '/';
    }

    // Parse the route map from the control repository. Determine:
    // * Which templates should be included in the template routes
    try {
      let routesDoc = JSON.parse(fs.readFileSync(path.join(configRoot, 'routes.json')));
      this.templateRoutes = routesDoc[this.site].routes;
    } catch (err) {
      console.error(err);
    }

    if (! this.templateRoutes) {
      this.templateRoutes = {};
    }
  }

  name () {
    return path.basename(this.contentRepositoryPath);
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

    return hasPresenterContainer;
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
      controlRepositoryLocation: this.controlRepositoryLocation,
      contentRepositoryPath: this.contentRepositoryPath,
      preparer: this.preparer
    };
  }

  reportError(message) {
    this.state = "error";
    this.error = message;
  }

  static deserialize({id, controlRepositoryLocation, contentRepositoryPath, preparer}) {
    return new ContentRepository(
      controlRepositoryLocation,
      contentRepositoryPath,
      preparer,
      id
    );
  }

};

export default {

  launchServicePod (repo) {
    let contentMap = {};
    contentMap[repo.site] = { content: {}, proxy: {} };
    contentMap[repo.site].content[repo.prefix] = repo.contentIDBase;
    contentMap[repo.site].proxy["/__local_asset__/"] = "http://content:8080/assets/";

    let templateRoutes = {};
    templateRoutes[repo.site] = {};
    templateRoutes[repo.site].routes = repo.templateRoutes;

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
          repo.controlRepositoryLocation + ':/var/control-repo:ro',
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
        "TRAVIS_PULL_REQUEST=false"
      ],
      HostConfig: {
        Binds: [repo.contentRepositoryPath + ":/usr/control-repo"],
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

    let repositoriesPath = path.join(osenv.home(), '.deconst', 'repositories.json');

    fs.writeFile(repositoriesPath, JSON.stringify(serializedRepos), (error) => {
      if (error) {
        console.error(error);
      }
    });
  }

};
