import alt from '../alt';
import DockerUtil from '../utils/DockerUtil';
import {ContentRepository} from '../utils/ContentRepositoryUtil';

class ContentRepositoryActions {

  launch (controlRepositoryLocation, contentRepositoryPath, preparer) {
    let repo = new ContentRepository(controlRepositoryLocation, contentRepositoryPath, preparer);
    this.dispatch({repo});

    DockerUtil.launchServicePod(repo);
  }

  prepare (repo) {
    DockerUtil.launchPreparer(repo);
    this.dispatch({repo});
  }

  podLaunched ({repo, contentContainer, presenterContainer}) {
    this.dispatch({repo, contentContainer, presenterContainer});
  }

  preparerLaunched ({repo, container}) {
    this.dispatch({repo, container});
  }

  error ({repo, error}) {
    this.dispatch({repo, error});
  }

}

export default alt.createActions(ContentRepositoryActions);
