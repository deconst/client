import path from 'path';
import alt from '../alt';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';
import DockerUtil from '../utils/DockerUtil';

class ContentRepository {

  constructor (id, controlRepositoryLocation, contentRepositoryPath) {
    this.id = id;
    this.controlRepositoryLocation = controlRepositoryLocation;
    this.contentRepositoryPath = contentRepositoryPath;
    this.state = "launching";

    this.contentContainer = null;
    this.presenterContainer = null;
  }

  name () {
    return path.basename(this.contentRepositoryPath);
  }

  publicURL() {
    if (!this.presenterContainer) {
      return "";
    }

    let host = DockerUtil.host;
    let port = this.presenterContainer.NetworkSettings.Ports['8080/tcp'][0].HostPort;

    return "http://" + host + ":" + port + "/";
  }

}

class ContentRepositoryStore {

  constructor() {
    this.bindActions(ContentRepositoryActions);
    this.repositories = {};
  }

  onLaunch({id, controlRepositoryLocation, contentRepositoryPath}) {
    this.repositories[id] = new ContentRepository(id, controlRepositoryLocation, contentRepositoryPath);
  }

  onPodLaunched({id, contentContainer, presenterContainer}) {
    let repo = this.repositories[id];
    if (!repo) {
      return ;
    }

    repo.state = "ready"
    repo.contentContainer = contentContainer;
    repo.presenterContainer = presenterContainer;
  }

  onError({id, error}) {
    let repo = this.repositories[id];
    if (!repo) {
      return ;
    }

    repo.state = "error";
    repo.error = error;
  }

}

export default alt.createStore(ContentRepositoryStore);
