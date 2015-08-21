import path from 'path';
import DockerUtil from './DockerUtil';

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

};
