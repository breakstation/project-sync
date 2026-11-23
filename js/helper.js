var cli = require('cli');
var fs = require('fs');
var helper = {};

//Helper methods
//get the source path based on sync direction
helper.getSource = function( syncDirection, remoteServer, config ){
  if( syncDirection === 'up' ){
    return '.';
  }else if ( syncDirection === 'down') {
    return config.servers[remoteServer].host + ':' + config.servers[remoteServer].path + '/';
  }
}

//get the destination path based on sync direction
helper.getDestination = function( syncDirection, remoteServer, config ){
  if( syncDirection === 'up' ){
    return config.servers[remoteServer].host + ':' + config.servers[remoteServer].path;
  }else if ( syncDirection === 'down') {
    return '.';
  }
}

//merge the global exlucdes with the server specific excludes
helper.getExludes = function( remoteServer, config ){
  return config.excludeGlobal.concat(config.servers[remoteServer].exclude);
}

//get the size(length) of an object
helper.Objectsize = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var FILE_LIST_SEPARATOR = '------------------------------------';

helper.createOutputState = function(){
  return { buffer: '', fileListOpen: false };
};

helper.outputState = helper.createOutputState();

function isFileListHeader(line){
  return /^(Transfer starting:|sending incremental file list|receiving incremental file list)/.test(line);
}

function isStatsStart(line){
  return line.indexOf('Number of files:') === 0;
}

// Split an rsync output chunk into print events. The file list sits between
// the transfer header and the stats block; mark that span with separators.
helper.renderRsyncChunk = function(chunk, state){
  var events = [];

  state.buffer += chunk;
  var lines = state.buffer.split('\n');
  state.buffer = lines.pop();

  lines.forEach(function(line){
    line = line.replace(/\r/g, '');

    if( isFileListHeader(line) ){
      state.fileListOpen = true;
      events.push({ type: 'info', text: line });
      events.push({ type: 'raw', text: FILE_LIST_SEPARATOR });
      return;
    }

    if( state.fileListOpen && isStatsStart(line) ){
      state.fileListOpen = false;
      events.push({ type: 'raw', text: FILE_LIST_SEPARATOR });
    }

    events.push({ type: 'raw', text: line });
  });

  return events;
};

helper.writeRsyncEvents = function(events){
  events.forEach(function(event){
    if( event.type === 'info' ){
      cli.info(event.text);
      return;
    }
    console.error(event.text);
  });
};

helper.resetRsyncOutput = function(){
  helper.outputState = helper.createOutputState();
};

helper.flushRsyncOutput = function(){
  if( !helper.outputState.buffer ){
    return;
  }
  var rest = helper.outputState.buffer;
  helper.outputState.buffer = '';
  helper.writeRsyncEvents(helper.renderRsyncChunk(rest + '\n', helper.outputState));
};

//Output info messages as rsync runs
helper.stdoutFunc = function(data){
  var text = data && data.toString ? data.toString() : String(data);
  helper.writeRsyncEvents(helper.renderRsyncChunk(text, helper.outputState));
};

//Output error messages as rsync runs
helper.stderrFunc = function(data){
  cli.error(data);
}

//simple fatal error handler
helper.onErr = function(err) {
  console.fatal(err);
}

/**
 * initializes a new project-sync.json file
 * @method function
 * @return {null} will add the file to the current directory
 */
helper.init = function(){
  //check if file exists
  try {
    fs.accessSync( './project-sync.json', fs.F_OK);

    //file already exists
    cli.fatal("project-sync.json already exists.");

  } catch (e) {
    //create file
    fs.writeFile( './project-sync.json', helper.skeleton(), function(err) {
        if(err) {
            return cli.fatal(err);
        }

        cli.ok("New project-sync.json started.");
        return;
    });
  }
}

helper.skeleton = function(){
  return JSON.stringify({
    "servers": {
      "prod": {
        "host": "ADD_YOUR_PROD_USER@HOST_HERE",
        "path": "ADD_YOUR_FULL_FILE_PATH_HERE",
        "exclude": [],
        "delete": false
      },
      "dev": {
        "host": "ADD_YOUR_DEV_USER@HOST_HERE",
        "path": "ADD_YOUR_FULL_FILE_PATH_HERE",
        "exclude": [],
        "delete": false
      }
    },
    "excludeGlobal": [
      "project-sync.json",
      ".git"
    ]
  }, null, 2);
}

module.exports = helper;
