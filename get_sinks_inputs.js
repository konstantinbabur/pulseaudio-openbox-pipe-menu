#!/usr/bin/node

const {spawn} = require('child_process');

const streamDataPromisify = (stream, encoding) => {
  return new Promise((resolve, reject) => {
    let dataArray = [];
    stream.on('data', data => dataArray.push(data.toString(encoding)));
    stream.on('end', () => resolve(dataArray.join('')))
  });
};

const listSinkInputsPromise = 
  streamDataPromisify(spawn('pacmd', ['list-sink-inputs']).stdout, 'utf-8');

const listSinksPromise = 
  streamDataPromisify(spawn('pacmd', ['list-sinks']).stdout, 'utf-8');

const inputSinkRegexp = /((index):\s*(\d+)|(sink):\s*(\d+)|(media\.name)\s*=\s*"(.+)"|(application\.name)\s*=\s*"(.+)")/g;
const sinkRegexp = /((index):\s*(\d+)|(device\.description)\s*=\s*"(.+)")/g;

Promise.all([listSinkInputsPromise.then(data => {
  let match,
    current;
  const inputsSinks = [];
  while (match = inputSinkRegexp.exec(data)) {
    if ([match[2]] == 'index') {
      inputsSinks.push(current = {index: match[3]});
    }
    else if (match[4] == 'sink') {
      current.sink = match[5];
    }
    else if (match[8] == 'application.name') {
      current.application = match[9];
    }
    else if (match[6] == 'media.name') {
      current.media = match[7];
    }
  }
  return {inputsSinks};
}),
listSinksPromise.then(data => {
  let match,
    current;
  const sinks = [];
  while (match = sinkRegexp.exec(data)) {
    if ([match[2]] == 'index') {
      sinks.push(current = {index: match[3]});
    }
    else if (match[4] == 'device.description') {
      current.name = match[5];
    }
  }
  return {sinks};
})]).then(requestResults => {
  const sinksAndInputs = {};
  requestResults.forEach(requestResult => Object.assign(sinksAndInputs, requestResult));
  process.stdout.write('<openbox_pipe_menu>');
  sinksAndInputs.inputsSinks.forEach(input => {
    let menuArray = [
      '<menu id="pacmd-input-', input.index,'" label="',
      input.index,
      ' ', input.application, ':', input.media,
      '">'
    ];
    sinksAndInputs.sinks.forEach(sink => {
      Array.prototype.push.apply(menuArray, [
        '<item label="', (sink.index == input.sink ? '*' : ' ') ,' ', sink.index, ' ', sink.name, '">',
        '<action name="Execute">',
        '<command>pacmd move-sink-input ', input.index, ' ', sink.index, '</command>',
        '</action>',
        '</item>'
      ]);
    });
    Array.prototype.push.apply(menuArray, [
      '</menu>'
    ]);
    process.stdout.write(menuArray.join(''));
  });
  process.stdout.write('</openbox_pipe_menu>');
});
