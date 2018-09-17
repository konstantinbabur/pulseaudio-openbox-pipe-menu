#!/usr/bin/node

const {spawn} = require('child_process');

const streamDataPromisify = (stream, encoding) => {
  return new Promise((resolve, reject) => {
    let dataArray = [];
    stream.on('data', data => dataArray.push(data.toString(encoding)));
    stream.on('end', () => resolve(dataArray.join('')))
  });
};

const getInputsSinksFromPacmd = data => {
  let match,
    current;

  const inputSinkRegexp = /((index):\s*(\d+)|(sink):\s*(\d+)|(media\.name)\s*=\s*"(.+)"|(application\.name)\s*=\s*"(.+)")/g,
    inputsSinks = [];

  while (match = inputSinkRegexp.exec(data)) {
    if (match[2] == 'index') {
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

  return inputsSinks;
};

const getSinksFromPacmd = data => {
  let match,
    current;

  const sinkRegexp = /((\*)?\s*(index):\s*(\d+)|(device\.description)\s*=\s*"(.+)")/g,
    sinks = [];

  while (match = sinkRegexp.exec(data)) {
    if (match[3] == 'index') {
      sinks.push(current = {
        index: match[4], 
        default: match[2] == '*'
      });
    }
    else if (match[5] == 'device.description') {
      current.name = match[6];
    }
  }
  return sinks;
};

const writeOpenboxPipeMenu = ([inputsSinks, sinks]) => {
  const stdout = process.stdout;

  stdout.write('<openbox_pipe_menu>');
  stdout.write('<separator label="аудио потоки"/>');

  for (let input of inputsSinks) {
    const inputIndex = input.index;

    stdout.write(`<menu id="pacmd-input-${inputIndex}" label="${inputIndex} ${input.application}:${input.media}">`);
    stdout.write('<separator label="устройства"/>');

    for (let sink of sinks) {
      stdout.write(`
        <item label="${sink.index == input.sink ? '*' : ' '} ${sink.index} ${sink.name}">
          <action name="Execute">
            <command>pacmd move-sink-input ${inputIndex} ${sink.index}</command>
          </action>
        </item>
      `);
    }

    stdout.write('</menu>');
  }

  stdout.write('<separator label="выход по-умолчанию"/>');

  for (let sink of sinks) {
    stdout.write(`
        <item label="${sink.default === true ? '*' : ' '} ${sink.index} ${sink.name}">
          <action name="Execute">
            <command>pacmd set-default-sink ${sink.index}</command>
          </action>
        </item>
    `);
  }

  stdout.write('</openbox_pipe_menu>');
}

Promise.all([
  streamDataPromisify(spawn('pacmd', ['list-sink-inputs']).stdout, 'utf-8').then(getInputsSinksFromPacmd),
  streamDataPromisify(spawn('pacmd', ['list-sinks']).stdout, 'utf-8').then(getSinksFromPacmd)
]).then(writeOpenboxPipeMenu);
