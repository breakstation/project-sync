var assert = require('assert');
var sync = require('../index');

function config(deleteFlag){
  return {
    servers: {
      dev: {
        host: 'user@example.com',
        path: '/var/www/site',
        exclude: [],
        delete: deleteFlag
      }
    },
    excludeGlobal: ['.git']
  };
}

function hasDryRunFlag(command){
  return /(^|\s)-[A-Za-z]*n(\s|$)/.test(command);
}

var withDelete = sync.buildCommand('up', 'dev', config(true));
var withDeleteCommand = withDelete.command();
var withoutDeleteCommand = sync.buildCommand('up', 'dev', config(false)).command();

assert.strictEqual(withDeleteCommand.indexOf('--delete=true'), -1, withDeleteCommand);
assert.notStrictEqual(withDeleteCommand.indexOf('--delete'), -1, withDeleteCommand);
assert.strictEqual(withoutDeleteCommand.indexOf('--delete'), -1, withoutDeleteCommand);

assert.strictEqual(withDelete.isSet('n'), true);
assert.strictEqual(hasDryRunFlag(withDeleteCommand), true, withDeleteCommand);

var live = sync.clearDryRun(withDelete);
var liveCommand = live.command();

assert.strictEqual(live.isSet('n'), false);
assert.strictEqual(hasDryRunFlag(liveCommand), false, liveCommand);
assert.strictEqual(liveCommand.indexOf('--delete=true'), -1, liveCommand);
assert.notStrictEqual(liveCommand.indexOf('--delete'), -1, liveCommand);
