// Modified from Kitematic by Ash Wilson

import async from 'async';
import fs from 'fs';
import path from 'path';
import dockerode from 'dockerode';
import _ from 'underscore';
import util from './Util';
import contentRepositoryActions from '../actions/ContentRepositoryActions';
import Promise from 'bluebird';

export default {
  host: null,
  client: null,
  placeholders: {},

  setup (ip, name) {
    if (!ip || !name) {
      throw new Error('Falsy ip or name passed to docker client setup');
    }

    let certDir = path.join(util.home(), '.docker/machine/machines/', name);
    if (!fs.existsSync(certDir)) {
      throw new Error('Certificate directory does not exist');
    }

    this.host = ip;
    this.client = new dockerode({
      protocol: 'https',
      host: ip,
      port: 2376,
      ca: fs.readFileSync(path.join(certDir, 'ca.pem')),
      cert: fs.readFileSync(path.join(certDir, 'cert.pem')),
      key: fs.readFileSync(path.join(certDir, 'key.pem'))
    });
  },

  init () {
    this.listen();
  },

  startContainer (name, containerData, callback) {
    let startopts = {
      Binds: containerData.Binds || []
    };

    if (containerData.NetworkSettings && containerData.NetworkSettings.Ports) {
      startopts.PortBindings = containerData.NetworkSettings.Ports;
    } else if (containerData.HostConfig && containerData.HostConfig.PortBindings) {
      startopts.PortBindings = containerData.HostConfig.PortBindings;
    } else {
      startopts.PublishAllPorts = true;
    }

    let container = this.client.getContainer(name);
    container.start(startopts, (error) => {
      if (error) {
        return callback(error);
      }

      this.fetchContainer(name, callback);
    });
  },

  createContainer (name, containerData, callback) {
    containerData.name = containerData.Name || name;

    if (containerData.Config && containerData.Config.Image) {
      containerData.Image = containerData.Config.Image;
    }

    if (!containerData.Env && containerData.Config && containerData.Config.Env) {
      containerData.Env = containerData.Config.Env;
    }

    containerData.Volumes = _.mapObject(containerData.Volumes, () => {return {};});

    let existing = this.client.getContainer(name);
    existing.kill(() => {
      existing.remove(() => {
        this.client.createContainer(containerData, (error) => {
          if (error) {
            if (callback) {
              callback(error);
            }
            return;
          }
          this.startContainer(name, containerData, callback);
        });
      });
    });
  },

  fetchContainer (name, callback) {
    this.client.getContainer(name).inspect((error, container) => {
      if (error) {
        return callback(error);
      }

      callback(null, container);
    });
  },

  run (name, repository, tag, extraConfig, callback) {
    tag = tag || 'latest';
    let imageName = repository + ':' + tag;

    let placeholderData = {
      Id: util.randomId(),
      Name: name,
      Image: imageName,
      Config: {
        Image: imageName,
      },
      Tty: true,
      OpenStdin: true,
      State: {
        Downloading: true
      }
    };

    this.pullImage(repository, tag, error => {
      if (error) {
        return callback(error);
        return;
      }

      let config = extraConfig || {};

      config.Image = imageName;
      config.Tty = true;
      config.OpenStdin = true;

      this.createContainer(name, config, callback);
    },
    // progress is actually the progression PER LAYER (combined in columns)
    // not total because it's not accurate enough
    progress => {
      // Progress happened!
    },
    () => {
      // Oops blocked
    });
  },

  listen () {
    this.client.getEvents((error, stream) => {
      if (error || !stream) {
        // TODO: Add app-wide error handler
        return;
      }

      stream.setEncoding('utf8');
      stream.on('data', json => {
        let data = JSON.parse(json);

        if (data.status === 'pull' || data.status === 'untag' || data.status === 'delete') {
          return;
        }

        if (data.status === 'destroy') {
          // Container destroyed
        } else if (data.id) {
          // Existing container updated
        }
      });
    });
  },

  pullImage (repository, tag, callback, progressCallback, blockedCallback) {
    this.client.pull(repository + ':' + tag, {}, (err, stream) => {
      if (err) {
        return callback(err);
      }

      stream.setEncoding('utf8');

      // scheduled to inform about progression at given interval
      let tick = null;
      let layerProgress = {};

      // Split the loading in a few columns for more feedback
      let columns = {};
      columns.amount = 4; // arbitrary
      columns.toFill = 0; // the current column index, waiting for layer IDs to be displayed
      let error = null;

      // data is associated with one layer only (can be identified with id)
      stream.on('data', str => {
        var data = JSON.parse(str);

        if (data.error) {
          error = data.error;
          return;
        }

        if (data.status && (data.status === 'Pulling dependent layers' || data.status.indexOf('already being pulled by another client') !== -1)) {
          blockedCallback();
          return;
        }

        if (data.status === 'Pulling fs layer') {
          layerProgress[data.id] = {
            current: 0,
            total: 1
          };
        } else if (data.status === 'Downloading') {
          if (!columns.progress) {
            columns.progress = []; // layerIDs, nbLayers, maxLayers, progress value
            let layersToLoad = _.keys(layerProgress).length;
            let layersPerColumn = Math.floor(layersToLoad / columns.amount);
            let leftOverLayers = layersToLoad % columns.amount;
            for (let i = 0; i < columns.amount; i++) {
              let layerAmount = layersPerColumn;
              if (i < leftOverLayers) {
                layerAmount += 1;
              }
              columns.progress[i] = {layerIDs: [], nbLayers:0 , maxLayers: layerAmount, value: 0.0};
            }
          }

          layerProgress[data.id].current = data.progressDetail.current;
          layerProgress[data.id].total = data.progressDetail.total;

          // Assign to a column if not done yet
          if (!layerProgress[data.id].column) {
            // test if we can still add layers to that column
            if (columns.progress[columns.toFill].nbLayers === columns.progress[columns.toFill].maxLayers && columns.toFill < columns.amount - 1) {
              columns.toFill++;
            }

            layerProgress[data.id].column = columns.toFill;
            columns.progress[columns.toFill].layerIDs.push(data.id);
            columns.progress[columns.toFill].nbLayers++;
          }

          if (!tick) {
            tick = setTimeout(() => {
              clearInterval(tick);
              tick = null;
              for (let i = 0; i < columns.amount; i++) {
                columns.progress[i].value = 0.0;
                if (columns.progress[i].nbLayers > 0) {
                  let layer;
                  let totalSum = 0;
                  let currentSum = 0;

                  for (let j = 0; j < columns.progress[i].nbLayers; j++) {
                    layer = layerProgress[columns.progress[i].layerIDs[j]];
                    totalSum += layer.total;
                    currentSum += layer.current;
                  }

                  if (totalSum > 0) {
                    columns.progress[i].value = Math.min(100.0 * currentSum / totalSum, 100);
                  } else {
                    columns.progress[i].value = 0.0;
                  }
                }
              }
              progressCallback(columns);
            }, 16);
          }
        }
      });
      stream.on('end', function () {
        callback(error);
      });
    });
  },

  // TODO: move this to machine health checks
  waitForConnection (tries, delay) {
    tries = tries || 10;
    delay = delay || 1000;
    let tryCount = 1, connected = false;
    return new Promise((resolve, reject) => {
      async.until(() => connected, callback => {
        this.client.listContainers(error => {
          if (error) {
            if (tryCount > tries) {
              callback(Error('Cannot connect to the Docker Engine. Either the VM is not responding or the connection may be blocked (VPN or Proxy): ' + error.message));
            } else {
              tryCount += 1;
              setTimeout(callback, delay);
            }
          } else {
            connected = true;
            callback();
          }
        });
      }, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  },

  launchServicePod (id, controlRepoPath) {
    let contentParams = {
      Env: [
        "NODE_ENV=development",
        "STORAGE=memory",
        "ADMIN_APIKEY=supersecret",
        "CONTENT_LOG_LEVEL=debug",
        "CONTENT_LOG_COLOR=true"
      ],
      HostConfig: {
        PublishAllPorts: true,
        ReadonlyRootfs: true
      }
    };

    let presenterParams = {
      Volumes: {
        "/var/control-repo": {}
      },
      Env: [
        "NODE_ENV=development",
        "CONTROL_REPO_PATH=/var/control-repo",
        "CONTENT_SERVICE_URL=http://content:8080/",
        "PRESENTER_LOG_LEVEL=debug",
        "PRESENTER_LOG_COLOR=true"
      ],
      HostConfig: {
        Binds: [ controlRepoPath + ":/var/control-repo:ro" ],
        Links: [ "content-" + id + ":content" ],
        PublishAllPorts: true,
        ReadonlyRootfs: true
      }
    };

    async.series([
      (cb) => {
        this.run("content-" + id, "quay.io/deconst/content-service", "latest", contentParams, cb);
      },
      (cb) => {
        this.run("presenter-" + id, "quay.io/deconst/presenter", "latest", presenterParams, cb);
      }
    ], (error, containers) => {
      if (error) {
        contentRepositoryActions.error({id, error});
        return;
      }

      let [contentContainer, presenterContainer] = containers;

      contentRepositoryActions.podLaunched({id, contentContainer, presenterContainer});
    });
  }
};
