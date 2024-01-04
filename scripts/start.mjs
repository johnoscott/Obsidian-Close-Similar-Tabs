import { execSync } from 'child_process';

console.log('- Installed dependencies');

console.log(`Starting the start process...\n`);

execSync('git fetch');
console.log('- Fetched git changes');

execSync('git pull');
console.log('- Pulled git changes');


execSync("start /B code .", { stdio: "ignore", shell: true });
console.log('- Opened current folder in VSCode');
console.log("- Running 'npm run dev'");

execSync('npm run dev', { stdio: 'inherit' });
