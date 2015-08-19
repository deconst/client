import path from 'path';
import alt from '../alt';
import contentRepositoryActions from '../actions/ContentRepositoryActions';

class ContentRepository {

  constructor (id, controlRepositoryLocation, contentRepositoryPath) {
    this.id = id;
    this.controlRepositoryLocation = controlRepositoryLocation;
    this.contentRepositoryPath = contentRepositoryPath;
    this.state = "launching";
  }

  name () {
    return path.basename(this.contentRepositoryPath);
  }

}

class ContentRepositoryStore {

  constructor() {
    this.bindActions(contentRepositoryActions);
    this.repositories = {};
  }

  onLaunch({id, controlRepositoryLocation, contentRepositoryPath}) {
    console.log("Store: launching " + id);
    this.repositories[id] = new ContentRepository(id, controlRepositoryLocation, contentRepositoryPath);
  }

  onPodLaunched({id, content, presenter}) {
    console.log("Store: launched " + id);
    let repo = this.repositories[id];
    if (!repo) {
      return ;
    }

    repo.state = "ready"
    repo.contentContainer = content;
    repo.presenterContainer = presenter;
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
