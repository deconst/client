import alt from '../alt';
import DockerUtil from '../utils/DockerUtil';
import ContentRepositoryUtil, {ContentRepository} from '../utils/ContentRepositoryUtil';

class ContentRepositoryActions {

  launch (controlRepositoryLocation, contentRepositoryPath, preparer) {
    let repo = new ContentRepository(controlRepositoryLocation, contentRepositoryPath, preparer);
    this.dispatch({repo});

    ContentRepositoryUtil.launchServicePod(repo);
  }

  edit (id, controlRepositoryLocation, contentRepositoryPath, preparer) {
    this.dispatch({id, controlRepositoryLocation, contentRepositoryPath, preparer});
  }

  prepareContent (repo) {
    ContentRepositoryUtil.launchContentPreparer(repo);
    this.dispatch({repo});
  }

  prepareControl (repo) {
    ContentRepositoryUtil.launchControlPreparer(repo);
    this.dispatch({repo});
  }

  remove (repo) {
    this.dispatch({repo});
  }

  podLaunched ({repo, contentContainer, presenterContainer}) {
    this.dispatch({repo, contentContainer, presenterContainer});
  }

  contentPreparerLaunched ({repo, container}) {
    this.dispatch({repo, container});
  }

  controlPreparerLaunched ({repo, container}) {
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
