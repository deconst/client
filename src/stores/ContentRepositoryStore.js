import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

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
    ContentRepositoryUtil.saveRepositories(this.repositories);
  }

  onEdit({id, displayName, controlRepositoryLocation, contentRepositoryPath, preparer}) {
    let r = this.repositories[id];
    if (!r) {
      return;
    }
    let changed = (displayName !== r.displayName);
    changed = changed || (controlRepositoryLocation !== r.controlRepositoryLocation);
    changed = changed || (contentRepositoryPath !== r.contentRepositoryPath);
    changed = changed || (preparer !== r.preparer);

    if (!changed) {
      return;
    }

    r.displayName = displayName;
    r.controlRepositoryLocation = controlRepositoryLocation;
    r.contentRepositoryPath = contentRepositoryPath;
    r.preparer = preparer;

    r.state = "relaunching";

    ContentRepositoryUtil.relaunchContainers(r);
    ContentRepositoryUtil.saveRepositories(this.repositories);
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

    let installWatcher = (root, fn, callback) => {
      let ignored = ['_build/**', '_site/**', '.git/**', '.DS_Store', 'npm-debug.log', 'build',
        '**/node_modules/**'];
      let gitignorePath = path.join(root, ".gitignore");

      fs.readFile(gitignorePath, {encoding: 'utf-8'}, (error, content) => {
        if (!error) {
          content.split(/\n+/).forEach((line) => {
            if (/\S/.test(line) && ! /^\s*#/.test(line)) {
              ignored.push(line);
            }
          });
        }

        let watcher = chokidar.watch(root, {
          persistent: false,
          ignored,
          ignoreInitial: true,
          atomic: true,
          cwd: root
        }).on('add', fn).on('change', fn).on('unlink', fn);

        callback(null, watcher);
      });
    };

    let prepareContent = (path) => {
      console.log("Launching content preparer because of a change to: " + path);
      ContentRepositoryUtil.launchContentPreparer(r)
    };
    installWatcher(r.contentRepositoryPath, prepareContent, (w) => r.contentWatcher = w);

    let prepareControl = (path) => {
      console.log("Launching control preparer because of a change to: " + path);
      ContentRepositoryUtil.launchControlPreparer(r);
    };
    installWatcher(r.controlRepositoryLocation, prepareControl, (w) => r.controlWatcher = w);
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

  onRemove({repo}) {
    let r = this.repositories[repo.id];
    delete this.repositories[repo.id];

    ContentRepositoryUtil.cleanContainers(r);
    ContentRepositoryUtil.saveRepositories(this.repositories);

    if (r.contentWatcher) {
      r.contentWatcher.close();
    }

    if (r.controlWatcher) {
      r.controlWatcher.close();
    }
  }

  onRelaunch({repo}) {
    let r = this.repositories[repo.id];
    if (!r) {
      return;
    }

    r.error = null;
    r.state = "relaunching";

    ContentRepositoryUtil.relaunchContainers(r);
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
          r.hasPrepared = true;
        }
      }

      if (r.controlPreparerContainer && r.controlPreparerContainer.Id === container.Id) {
        // The control preparer has completed.
        r.controlPreparerContainer = null;
        if (!r.isPreparing()) {
          r.state = "ready";
          r.hasPrepared = true;
        }
      }

      if (r.contentContainer && r.contentContainer.Id === container.Id) {
        if (r.state !== "relaunching") {
          r.reportError("Content service has died.");
        }
      }

      if (r.presenterContainer && r.presenterContainer.Id === container.Id) {
        if (r.state !== "relaunching") {
          r.reportError("Presenter has died.");
        }
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
