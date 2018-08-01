const globby = require('globby');
const path = require('path');
const { parse, transform } = require('ember-template-recast');
const fs = require('fs');
const assert = require('assert');

// From hanldebars website. Let is ember specific and will be introduced later
const builtInHelpers = ['if', 'unless', 'each', 'with', 'log', 'lookup', 'let'];
let componentsReigistry = {};

const pushOrIgnore = (array ,itemsToPush) => {
    itemsToPush.forEach((item) => {
        if (!array.includes(item)) {
            array.push(item);
        }
    });
}

const pushToDepsArray = (invokedComponentName, componentName) => {
    if(!componentsReigistry[invokedComponentName]) {
        console.log(`Could not find component ${invokedComponentName} on registry`)
      } else {
          if(!componentsReigistry[componentName].includes(invokedComponentName) 
            && !builtInHelpers.includes(invokedComponentName)) {
            componentsReigistry[componentName].push(invokedComponentName)
          }
      }
}

const findDeps = function({ source, path }, { parse, visit }) {
    const ast = parse(source);
  
    return visit(ast, env => {
      let { builders: b } = env.syntax;
      const componentName = path.split('components/')[1].replace('.hbs', '');
      return {
        MustacheStatement(node) {
          const invokedComponentName = node.path.original;
          pushToDepsArray(invokedComponentName, componentName);
          return node;
        },
        BlockStatement(node) {
          const invokedComponentName = node.path.original;
          pushToDepsArray(invokedComponentName, componentName);
          return node;
        }
      };
    });
  };

function readFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, contents) => {
      err ? reject(err) : resolve(contents);
    });
  });
}

function applyTransform(plugin, filePath, contents) {
    const code = plugin(
      {
        path: filePath,
        source: contents,
      },
      {
        parse,
        visit(ast, callback) {
          const results = transform(ast, callback);
          return results && results.code;
        },
      }
    );
  
    return {
      skipped: !code,
      changed: code !== contents,
      source: code,
    };
  }

describe('app', function() {
    it('should do the thing', function(done) {
        const pathName = path.resolve(__dirname, 'components/**/*.hbs');
        globby(pathName, { absolute: true })
            .then(files => {
                if (files.length < 1) {
                throw new Error('No files found');
                }
            
                return files;
            })
            .then((files) => {
                const componentNames = files.map((file) => file.split('components/')[1].replace('.hbs', ''));
                componentNames.map((name) => componentsReigistry[name] = []);
                const promiseArray = files.map((fileName) => 
                    readFile(fileName)
                        .then((contents) => applyTransform(findDeps, fileName, contents))
                );
                return Promise.all(promiseArray).then((args) => {
                    let resolvedDeps = [];
                    // Add the things with 1 dep first then build up from there
                    let index = 1;
                    while (resolvedDeps.length != Object.keys(componentsReigistry).length) {
                        const deps = Object.keys(componentsReigistry).filter((key) => componentsReigistry[key].length === index);
                        for (const dep of deps) {
                            Object.keys(componentsReigistry).forEach((key) => {
                                if (componentsReigistry[key].includes(dep)) {
                                    // Push all of this components deps to the consuming components dependencies
                                    pushOrIgnore(componentsReigistry[key], componentsReigistry[dep]);
                                }
                            });
                        }
                        index++;
                        resolvedDeps.push(...deps);
                    }
                return componentsReigistry;
                })
            })
            .then((deps) => {
                console.log(deps);
                assert.deepEqual(deps['test'], []);
                assert.deepEqual(deps['test2'], [ 'test' ]);
                assert.deepEqual(deps['test3'], [ 'test2', 'nested/nested', 'test' ]);
                assert.deepEqual(deps['test4'], [ 'test3', 'test2', 'nested/nested', 'test' ]);
                assert.deepEqual(deps['nested/nested'], [ 'tegst' ]);
                done();
            });
    });
});

