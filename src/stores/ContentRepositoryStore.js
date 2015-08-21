import path from 'path';
import alt from '../alt';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';
import DockerUtil from '../utils/DockerUtil';

class ContentRepositoryStore {

  constructor() {
    this.bindActions(ContentRepositoryActions);
    this.repositories = {};
  }

  onLaunch({repo}) {
    this.repositories[repo.id] = repo;
  }

  onPodLaunched({repo, contentContainer, presenterContainer}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "ready";
    r.contentContainer = contentContainer;
    r.presenterContainer = presenterContainer;
  }

  onPrepare({repo}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "launching preparer";
  }

  onPreparerLaunched({repo}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "submitting";
  }

  onError({repo, error}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "error";
    r.error = error;
  }

}

export default alt.createStore(ContentRepositoryStore);
