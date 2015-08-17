import alt from '../alt';
import contentRepositoryActions from '../actions/ContentRepositoryActions';

class ContentRepositoryStore {

  constructor() {
    this.bindActions(contentRepositoryActions);
    this.repositories = {};
  }

  onLaunch({id, contentRepositoryPath}) {
    console.log("Store: launching " + id);
    this.repositories[id] = {id, contentRepositoryPath, state: "launching"};
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
