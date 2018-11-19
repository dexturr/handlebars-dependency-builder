const path = require('path');
const assert = require('assert');
const DepBuilder = require('../index');

describe('app', function() {
  it('should do the thing', function(done) {
    const pathName = path.resolve(__dirname, 'components/**/*.hbs');
    const depBuilder = new DepBuilder();
    depBuilder.getFlattenedDependencies(pathName)
      .then((deps) => {
        assert.deepStrictEqual(deps['test'], []);
        assert.deepStrictEqual(deps['test2'], [ 'test' ]);
        assert.deepStrictEqual(deps['test3'], [ 'test2', 'nested/nested', 'test' ]);
        assert.deepStrictEqual(deps['test4'], [ 'test3', 'test2', 'nested/nested', 'test' ]);
        assert.deepStrictEqual(deps['nested/nested'], [ 'test' ]);
        done();
      });
  });
});

