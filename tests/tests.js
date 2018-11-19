const path = require('path');
const assert = require('assert');
const DepBuilder = require('../index');

describe('app', function() {
  it('should do the thing', function() {
    const pathName = path.resolve(__dirname, 'components');
    const depBuilder = new DepBuilder();
    const deps = depBuilder.getFlattenedDependencies(pathName)
    assert.deepStrictEqual(deps['test'], []);
    assert.deepStrictEqual(deps['test2'], [ 'test' ]);
    assert.deepStrictEqual(deps['test3'], [ 'test2', 'nested/nested', 'test' ]);
    assert.deepStrictEqual(deps['test4'], [ 'test3', 'test2', 'nested/nested', 'test' ]);
    assert.deepStrictEqual(deps['nested/nested'], [ 'test' ]);
  });
});

