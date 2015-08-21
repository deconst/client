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

  onPreparerLaunched({repo, container}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "preparing";
    r.preparerContainer = container;
  }

  onContainerCompleted({container}) {
    // Identify which repository this container belongs to, if any.
    for(let id in this.repositories) {
      let r = this.repositories[id];
      if (r.preparerContainer && r.preparerContainer.Id === container.Id) {
        // This repository's preparer has completed.
        r.state = "ready";
        r.preparerContainer = null;
      }

      if (r.contentContainer && r.contentContainer.Id === container.Id) {
        r.reportError("Content service has died.");
      }

      if (r.presenterContainer && r.presenterContainer.Id === container.Id) {
        r.reportError("Presenter has died.");
      }
    }
  }

  onError({repo, error}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.reportError(error);
  }

}

export default alt.createStore(ContentRepositoryStore);
