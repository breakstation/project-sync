var assert = require('assert');
var sync = require('../index');
var helper = require('../js/helper');

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

var outputState = helper.createOutputState();
var rsyncOutput = [
  'Transfer starting: 4 files',
  './',
  'hello.txt',
  'something/',
  'Number of files: 4',
  'Number of files transferred: 1',
  'Total received: 38 B'
].join('\n') + '\n';
var events = helper.renderRsyncChunk(rsyncOutput, outputState);
var texts = events.map(function(event){ return event.text; });

assert.strictEqual(events[0].type, 'info');
assert.strictEqual(texts[0], 'Transfer starting: 4 files');
assert.strictEqual(texts[1], '------------------------------------');
assert.deepStrictEqual(texts.slice(2, 5), ['./', 'hello.txt', 'something/']);
assert.strictEqual(texts[5], '------------------------------------');
assert.strictEqual(texts[6], 'Number of files: 4');
assert.strictEqual(texts.indexOf('Number of files transferred: 1') > 5, true);
