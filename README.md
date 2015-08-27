## Deconst Client

*Build Deconst documentation locally*

The Deconst client is an application that can build a content repository as you edit its source, with true layouts and styles.

It's built on [kite-shell](https://github.com/smashwilson/kite-shell), which is based heavily on [Kitematic](https://kitematic.com/).

## Installing

To install the Deconst client:

 1. Download the .zip file for your platform from the [latest release](https://github.com/deconst/client/releases).
 2. Unzip the application and drag it to your Applications folder.
 3. Control-click the app to launch it for the first time, then click "open" on the unsigned code warning.
 4. :tada:

## Diagnostics

### Inspector

You can open the Chromium web inspector by choosing "Toggle Dev Tools" from the Window menu. This is a good way to see any console messages or errors that have happened.

### Inspecting Docker Containers

It's sometimes useful to check on the state of or read logs from the docker containers that the client is using. To do so, download and install [docker and docker-machine](https://www.docker.com/toolbox), then open a Terminal and run:

```bash
eval "$(docker-machine env deconst-client)"
```

Now, in this terminal, you can use normal `docker` commands to inspect things.

## Copyright and License

Code released under the [Apache license](LICENSE) as a Derivative Work of Kitematic.
Images are copyrighted by Docker, Inc.
