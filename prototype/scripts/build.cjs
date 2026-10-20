const path = require('node:path');
const webpack = process.env.HABITS_WEBPACK ? require(process.env.HABITS_WEBPACK).webpack : require('webpack');
webpack({mode:'production',target:'web',entry:path.resolve('src/entry.tsx'),output:{path:path.resolve('dist'),filename:'app.js'},resolve:{extensions:['.tsx','.ts','.mjs','.js'],modules:[process.env.HABITS_NODE_MODULES || 'node_modules']},module:{rules:[{test:/\.tsx?$/,use:path.resolve('scripts/tsx-loader.cjs')}]},optimization:{minimize:false}},(error,stats)=>{
  if(error || stats.hasErrors()){ console.error(error || stats.toString({all:false,errors:true})); process.exitCode=1; }
  else console.log(stats.toString({all:false,assets:true}));
});
