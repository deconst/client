import alt from '../alt';
import DockerUtil from '../utils/DockerUtil';
import ContentRepositoryUtil, {ContentRepository} from '../utils/ContentRepositoryUtil';

class ContentRepositoryActions {

  launch (controlRepositoryLocation, contentRepositoryPath, preparer) {
    let repo = new ContentRepository(controlRepositoryLocation, contentRepositoryPath, preparer);
    this.dispatch({repo});

    ContentRepositoryUtil.launchServicePod(repo);
  }

  prepare (repo) {
    ContentRepositoryUtil.launchPreparer(repo);
    this.dispatch({repo});
  }

  podLaunched ({repo, contentContainer, presenterContainer}) {
    this.dispatch({repo, contentContainer, presenterContainer});
  }

  preparerLaunched ({repo, container}) {
    this.dispatch({repo, container});
  }

  containerCompleted ({container}) {
    this.dispatch({container});
  }

  error ({repo, error}) {
    this.dispatch({repo, error});
  }

}

export default alt.createActions(ContentRepositoryActions);
