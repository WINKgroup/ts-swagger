const myClass = require('./src/index.ts');

const json = new myClass();

json.generateSwagger('src/test.ts', 'Person API', 'v1').then(
    result => json.createJson(result.data, 'swagger.json'));