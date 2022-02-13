# citadel-dev-tools

A collection of tools to make developing Citadel and Umbrel easier.
This currently contains the CLI app "citadel-dev".

### Usage

See `citadel-dev --help` for more information.

### Usage for Umbrel

You need a GitHub access token for this tool.

1. `git clone https://github.com/runcitadel/dev-tools`
2. `export GITHUB_TOKEN=yourtoken`
3. `yarn`
4. `yarn tsc`
5. `yarn citadel-dev -n Umbrel appcheck`
