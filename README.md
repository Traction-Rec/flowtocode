# flowtocode

[![NPM](https://img.shields.io/npm/v/flowtocode.svg?label=flowtocode)](https://www.npmjs.com/package/flowtocode) [![Downloads/week](https://img.shields.io/npm/dw/flowtocode.svg)](https://npmjs.org/package/flowtocode) [![License](https://img.shields.io/badge/License-MIT%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/flowtocode/main/LICENSE.txt)

## Convert Salesforce Flows To Pseudocode

Convert Salesforce Flows to pseudocode! Add the pseudocode to source control for more human-friendly diffs.

## Example

Turn [this flow metadata file](https://github.com/Traction-Rec/flowtocode/blob/main/test/resources/test.flow-meta.xml) into human-reviewable pseudocode.

`sf plugins install flowtocode`
`sf ftc generate code -f ./test.flow-meta.xml` creates file `./test.ftc` with contents:

    ACTION CALL: Execute_Apex_Query
    SCREEN: Select_Items_Screen
    LOOP: Action_Loop
      ASSIGNMENT: Create_Request
      ASSIGNMENT: Add_Request
    try:
      ACTION CALL: DoBulkAction
      SCREEN: Confirmation_Screen
    except:
      SCREEN: Fault_Screen

## .forceignore

By default the tool creates a `.ftc` pseudocode file in the same directory as the target flow. 

To ensure this doesn't conflict with SF cli functionality, add the following like to the `.forceignore` file:

    # ignore automatically-generated flow pseudocode documentation
    **/*.ftc

## Husky hook

To automatically run flow to code on commit, you can add this to your husky pre-commit script:

    flow_files=$(git diff --cached --name-only | grep '\.flow-meta\.xml$' | xargs -I {} realpath "{}")
    if [ -n "$flow_files" ]; then
        echo "Generating flow to code!"
    
        # Check if the sf ftc plugin is installed
        if ! sf plugins --core | grep -q flowtocode; then
            echo "sf ftc plugin is not installed. Installing now..."
            echo "y" | sf plugins install flowtocode || echo "ftc install failed" && true
        fi
    
        # Iterate over each file and run the command
        for file in $flow_files; do
            sf ftc generate code -f "$file" || echo "ftc generation failed on $file" && true
            ftc_file="${file%.flow-meta.xml}.ftc"
            git add "$ftc_file" || echo "git staging ftc file failed on $file" && true  
        done
    fi

## Learn about `sf` plugins

Salesforce CLI plugins are based on the [oclif plugin framework](<(https://oclif.io/docs/introduction.html)>). Read the [plugin developer guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_plugins.meta/sfdx_cli_plugins/cli_plugins_architecture_sf_cli.htm) to learn about Salesforce CLI plugin development.

This repository contains a lot of additional scripts and tools to help with general Salesforce node development and enforce coding standards. You should familiarize yourself with some of the [node developer packages](#tooling) used by Salesforce.

Additionally, there are some additional tests that the Salesforce CLI will enforce if this plugin is ever bundled with the CLI. These test are included by default under the `posttest` script and it is required to keep these tests active in your plugin if you plan to have it bundled.

### Tooling

- [@salesforce/core](https://github.com/forcedotcom/sfdx-core)
- [@salesforce/kit](https://github.com/forcedotcom/kit)
- [@salesforce/sf-plugins-core](https://github.com/salesforcecli/sf-plugins-core)
- [@salesforce/ts-types](https://github.com/forcedotcom/ts-types)
- [@salesforce/ts-sinon](https://github.com/forcedotcom/ts-sinon)
- [@salesforce/dev-config](https://github.com/forcedotcom/dev-config)
- [@salesforce/dev-scripts](https://github.com/forcedotcom/dev-scripts)

### Hooks

For cross clouds commands, e.g. `sf env list`, we utilize [oclif hooks](https://oclif.io/docs/hooks) to get the relevant information from installed plugins.

This plugin includes sample hooks in the [src/hooks directory](src/hooks). You'll just need to add the appropriate logic. You can also delete any of the hooks if they aren't required for your plugin.

### Release

```
yarn && yarn build;
yarn version
yarn publish --access public
```

# SF CLI Plugin Info

This plugin is bundled with the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli). For more information on the CLI, read the [getting started guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm).

We always recommend using the latest version of these commands bundled with the CLI, however, you can install a specific version or tag if needed.

## Install

```bash
sf plugins install flowtocode@x.y.z
```

## Issues

Please report any issues at https://github.com/forcedotcom/cli/issues

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/flowtocode

# Install the dependencies and compile
yarn && yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev hello world
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins link .
# To verify
sf plugins
```

## Commands

<!-- commands -->

- [`sf ftc generate code`](#sf-ftc-generate-code)

## `sf ftc generate code`

Convert a flow into pseudocode.

```
USAGE
  $ sf ftc generate code -f <value> [--json] [--flags-dir <value>] [-d <value>]

FLAGS
  -d, --output=<value>  The output directory for the pseudocode. If not provided, the pseudocode will be written to the
                        same directory as the flow file.
  -f, --file=<value>    (required) The flow file to convert to pseudocode.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Convert a flow into pseudocode.

  Create pseudocode for the given flow & write it to standard output.

EXAMPLES
  $ sf ftc generate code -f ./test.flow
```

<!-- commandsstop -->
