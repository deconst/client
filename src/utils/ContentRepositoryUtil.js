import path from 'path';
import async from 'async';

import DockerUtil from './DockerUtil';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';

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
        "/var/control-repo": {}
      },
      Env: [
        "NODE_ENV=development",
        "CONTROL_REPO_PATH=/var/control-repo",
        "CONTROL_CONTENT_FILE=/var/content.json",
        "CONTENT_SERVICE_URL=http://content:8080/",
        "PRESENTER_LOG_LEVEL=debug",
        "PRESENTER_LOG_COLOR=true",
        "PRESENTED_URL_DOMAIN=local.deconst.horse",
      ],
      HostConfig: {
        Binds: [
          repo.controlRepositoryLocation + ":/var/control-repo:ro",
          path.resolve(path.join(__dirname, '..', 'static', 'content.json')) + ':/var/content.json:ro'
        ],
        Links: [ "content-" + repo.id + ":content" ],
        PublishAllPorts: true,
        ReadonlyRootfs: true
      }
    };

    async.series([
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
