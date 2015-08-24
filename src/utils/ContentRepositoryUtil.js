import fs from 'fs';
import os from 'os';
import path from 'path';
import async from 'async';
import _ from 'underscore';

import DockerUtil from './DockerUtil';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

function normalize(contentID) {
  if (contentID.endsWith("/")) {
    return contentID;
  }
  return contentID + "/";
}

export class ContentRepository {

  constructor (controlRepositoryLocation, contentRepositoryPath, preparer) {
    let lastID = parseInt(sessionStorage.getItem('content-repository-id') || '0');
    let id = lastID + 1;
    sessionStorage.setItem('content-repository-id', id.toString())

    this.id = id;
    this.controlRepositoryLocation = controlRepositoryLocation;
    this.contentRepositoryPath = contentRepositoryPath;
    this.state = "launching";
    this.preparer = preparer;

    this.contentContainer = null;
    this.presenterContainer = null;
    this.preparerContainer = null;

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
      let routes = JSON.parse(fs.readFileSync(path.join(configRoot, 'routes.json')))[this.site].routes;
      let results = {};

      Object.keys(routes).forEach((prefix) => {
        let template = routes[prefix];
        prefix = normalize(prefix);

        // Preserve template routes that are mapped beneath the path that the content ID is.
        if (prefix.startsWith('^' + this.prefix)) {
          results['^' + prefix.slice(this.prefix.length)] = template;
        } else if (prefix.length > 1 && prefix[0] !== '^') {
          results[prefix] = template;
        }
      });

      this.templateRoutes = results;
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

  _containerURL(container) {
    if (!container) {
      return "";
    }

    let host = DockerUtil.host;
    let port = container.NetworkSettings.Ports['8080/tcp'][0].HostPort;

    return "http://" + host + ":" + port + "/";
  }

  publicURL() {
    return this._containerURL(this.presenterContainer);
  }

  contentURL() {
    return this._containerURL(this.contentContainer);
  }

  canSubmit() {
    let hasContentContainer = !! this.contentContainer;
    let isReady = this.state === "ready";

    return hasContentContainer && isReady;
  }

  reportError(message) {
    this.state = "error";
    this.error = message;
  }

};

export default {

  launchServicePod (repo) {
    let contentMap = {};
    contentMap[repo.site] = {
      content: { "/": repo.contentIDBase },
      proxy: { "/__local_asset__/": "http://content:8080/assets/" }
    };

    console.log(require('util').inspect(contentMap));

    let templateRoutes = {};
    templateRoutes[repo.site] = {
      routes: repo.templateRoutes
    };

    console.log(require('util').inspect(templateRoutes));

    let controlOverrideDir = path.join(os.tmpdir(), 'control-' + repo.id);
    let mapOverridePath = path.join(controlOverrideDir, 'content.json');
    let templateOverridePath = path.join(controlOverrideDir, 'routes.json');

    console.log("controlOverrideDir = " + controlOverrideDir);

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
      (cb) => {
        fs.mkdir(controlOverrideDir, (err) => {
          if (err && err.code !== 'EEXIST') {
            cb(err);
          }
          cb(null);
        });
      },
      (cb) => fs.writeFile(mapOverridePath, JSON.stringify(contentMap), cb),
      (cb) => fs.writeFile(templateOverridePath, JSON.stringify(templateRoutes), cb),
      (cb) => {
        DockerUtil.run("content-" + repo.id, "quay.io/deconst/content-service", "latest", contentParams, cb);
      },
      (cb) => {
        DockerUtil.run("presenter-" + repo.id, "quay.io/deconst/presenter", "latest", presenterParams, cb);
      }
    ], (error, containers) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      let [contentContainer, presenterContainer] = containers;

      ContentRepositoryActions.podLaunched({repo, contentContainer, presenterContainer});
    });
  },

  launchPreparer (repo) {
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

    DockerUtil.run("preparer-" + repo.id, "quay.io/deconst/preparer-" + repo.preparer, "latest", params, (error, container) => {
      if (error) {
        ContentRepositoryActions.error({repo, error});
        return;
      }

      ContentRepositoryActions.preparerLaunched({repo, container});
    })
  }

};
