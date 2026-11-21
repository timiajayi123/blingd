const fs=require('node:fs'),path=require('node:path');
const index=process.argv.indexOf('--name'),name=process.argv[index+1];
if(index<0||!name||/[<>\r\n]/.test(name))throw new Error('Usage: npm run template:brand -- --name "Your Store"');
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','.git','scripts'].includes(entry.name))continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(tsx?|json)$/.test(file)){let text=fs.readFileSync(file,'utf8');text=text.replaceAll('YOUR BRAND',name.replaceAll('"','')).replaceAll('Your Brand',name.replaceAll('"',''));fs.writeFileSync(file,text);}}}
walk(process.cwd());console.log('Brand text updated. Configure your domains, media and integrations in .env.local.');
