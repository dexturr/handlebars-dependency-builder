# Handlebars Dependency Builder

This is used to build a flattened dependency tree for handlebars files.

I mainly use this in component libraries in order to allow white listing of components. For example if you only want to include `x-foo` from your component library but it is dependent on `x-bar` which is dependent on `x-baz` then you need to include all of these files.

This can be done with a static map on smaller or stable libraries such as [ember-bootstrap](https://github.com/kaliber5/ember-bootstrap/blob/master/index.js#L30-L39). However for evolving component libraries this can be a source of weird bugs so this solution is advised.