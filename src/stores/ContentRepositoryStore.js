import path from 'path';
import alt from '../alt';
import ContentRepositoryActions from '../actions/ContentRepositoryActions';
import ContentRepositoryUtil from '../utils/ContentRepositoryUtil';

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

    r.contentContainer = contentContainer;
    r.presenterContainer = presenterContainer;

    ContentRepositoryUtil.launchContentPreparer(r);
    ContentRepositoryUtil.launchControlPreparer(r);
  }

  onPrepareContent({repo}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "preprepare";
  }

  onPrepareControl({repo}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "preprepare";
  }

  onContentPreparerLaunched({repo, container}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "preparing";
    r.contentPreparerContainer = container;
  }

  onControlPreparerLaunched({repo, container}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.state = "preparing";
    r.controlPreparerContainer = container;
  }

  onContainerCompleted({container}) {
    // Identify which repository this container belongs to, if any.
    for(let id in this.repositories) {
      let r = this.repositories[id];
      if (r.contentPreparerContainer && r.contentPreparerContainer.Id === container.Id) {
        // This repository's preparer has completed.
        r.contentPreparerContainer = null;
        if (!r.isPreparing()) {
          r.state = "ready";
        }
      }

      if (r.controlPreparerContainer && r.controlPreparerContainer.Id === container.Id) {
        // The control preparer has completed.
        r.controlPreparerContainer = null;
        if (!r.isPreparing()) {
          r.state = "ready";
        }
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
