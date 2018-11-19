const globby = require('globby');
const { parse, transform } = require('ember-template-recast');
const fs = require('fs');

// From hanldebars website. Let is ember specific and will be introduced later
const ignoreComponents = ['if', 'unless', 'each', 'with', 'log', 'lookup', 'let', 'yeild', 'action'];

module.exports = class HandblebarsDependencyBuilder {
  constructor() {
    this.componentsRegistry = {};
  }

  async getFlattenedDependencies(pathName) {
    const files = await globby(pathName, { absolute: true })
    if (files.length < 1) {
      throw new Error('No files found');
    }
    const componentNames = files.map((file) => file.split('components/')[1].replace('.hbs', ''));
    componentNames.map((name) => this.componentsRegistry[name] = []);
    for (const file of files) {
      const fileText = await this.readFile(file);
      this.applyTransform(this.findDeps.bind(this), file, fileText)
    }
    let resolvedDeps = [];

    // Flatten the dependncy graph
    // Add the things with 1 dep first then build up from there
    let index = 0;
    while (resolvedDeps.length != Object.keys(this.componentsRegistry).length) {
      const deps = Object
        .keys(this.componentsRegistry)
        .filter((key) => this.componentsRegistry[key].length === index);

      for (const dep of deps) {
        Object.keys(this.componentsRegistry)
          .forEach((key) => {
            if (this.componentsRegistry[key].includes(dep)) {
              // Push all of this components deps to the consuming components dependencies
              this.pushOrIgnore(this.componentsRegistry[key], this.componentsRegistry[dep]);
            }
          });
      }
      index++;
      resolvedDeps.push(...deps);
    }
    return this.componentsRegistry;
  }

  pushOrIgnore(array ,itemsToPush) {
    itemsToPush.forEach((item) => {
      if (!array.includes(item)) {
        array.push(item);
      }
    });
  }

  pushToDepsArray(invokedComponentName, componentName) {
    if(ignoreComponents.includes(invokedComponentName) || invokedComponentName.startsWith('@') || invokedComponentName.startsWith('this')) {
      return;
    }
  
    if(!this.componentsRegistry[invokedComponentName]) {
      console.log(`Could not find component ${invokedComponentName}`)
    } else if(!this.componentsRegistry[componentName].includes(invokedComponentName)) {
      this.componentsRegistry[componentName].push(invokedComponentName)
    }
  }

  findDeps({ source, path }, { parse, visit }) {
    const ast = parse(source);
    const pushToDepsArray = this.pushToDepsArray.bind(this);
    
    return visit(ast, () => {
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
  }

  readFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, contents) => {
        err ? reject(err) : resolve(contents);
      });
    });
  }

  applyTransform(plugin, filePath, contents) {
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
}