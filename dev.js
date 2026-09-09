const { spawn } = require('child_process');

console.log('\x1b[36m%s\x1b[0m', '=====================================================');
console.log('\x1b[36m%s\x1b[0m', ' 🚀 ShohojHisab Monorepo Dev Server Starting... ');
console.log('\x1b[36m%s\x1b[0m', ' 🔌 Backend API: http://localhost:4005');
console.log('\x1b[36m%s\x1b[0m', ' 🌐 Frontend Web: http://localhost:3005');
console.log('\x1b[36m%s\x1b[0m', '=====================================================\n');

function runProcess(name, command, args, color) {
  const proc = spawn(command, args, {
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  const prefix = `${color}[${name}]\x1b[0m `;

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${prefix}${line}`);
      }
    }
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${prefix}\x1b[31m${line}\x1b[0m`);
      }
    }
  });

  proc.on('close', (code) => {
    console.log(`${prefix}Process exited with code ${code}`);
  });

  return proc;
}

const apiProcess = runProcess('API:4005', 'npm', ['run', 'dev:api'], '\x1b[35m');
const webProcess = runProcess('WEB:3005', 'npm', ['run', 'dev:web'], '\x1b[32m');

function cleanup() {
  console.log('\n\x1b[33mStopping all ShohojHisab dev services...\x1b[0m');
  try { apiProcess.kill('SIGTERM'); } catch (e) {}
  try { webProcess.kill('SIGTERM'); } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
