# Ts-Swagger

Ts-Swagger is a Javascript library that converts Typescript interfaces and Express APIs into OpenAPI/Swagger JSON.

Ts-Swagger library scans the Typescript files of interest and converts interfaces and APIs marked with specific comments. As a result it provides a JSON composed according to the OpenAPI 3 specification. Optionally generate a file with a .json extension in the project root.

## Installation

```bash
npm i @winkgroup/ts-swagger
```

## Usage

In order to be properly used, Ts-Swagger requires a **configuration file** with the paths containing all of your interfaces/API, along with some other info such as the documentation title (apiName) and version. Other optional info is the description and list of servers.

This file **must be placed at the root** of your project folder.

```JSON
{
    "pathList": [
        "./model/User.ts",
        "./model/Cart.ts",
        "./routes/api/user.js"
    ],
    "apiName": "",
    "version": "",
    "description": "",
    "servers": [
        {
            "url": "http://localhost:3000/",
            "description": "Staging"
        },
    ]
}
```

In order for the library to work, you need to add a **comment** inside every interface that you want to generate Swagger for.
```ts
// swagger
```
```ts

// This interface will be converted 
export interface User {
    // swagger
    name: string,
    id: number
}

// This interface won't be converted
export interface Cart {
    productName: string,
    price: number,
    quantity: number,
    productId: number
}
```


Your **APIs** will also need a comment that specifies **which interface they're using**, otherwise the swagger for them won't be generated.

```js
app.get('/users', function(req, res) {
    // schema: User
    res.send(Users);
});
```

Other optional comments are the description of the API and its response.

```js
app.get('/users', function(req, res) {
    // schema: User
    // description: Get all users
    // response_description: Array of users
    res.send(Users);
});
```

With the following syntax you can also add the description of status codes other than 200 and if you want with an optional comment, you can provide a reference to the Typesccript interface that describes the related response.

```js
app.get('/users/:userId', function(req, res) {
    // schema: User
    // {404}: Not found
    // {500}: Some server error
    // error_schema: Error
    res.send(User);
});
```

The library exposes a method called **getSwagger()** that returns the Swagger JSON. If a **filename** is provided as an argument, a new file containing the JSON will be created in the root of your project.

```js
import { TsSwagger } from "@winkgroup/ts-swagger";

// Configuration file path must be passed inside class constructor
const tsswg = new TsSwagger("../tsswagger.config.json");

// Returns the JSON Swagger
const swaggerObj = tsswg.getSwagger();

// Creates the JSON Swagger file
tsswg.getSwagger('swagger.json');

```

## Maintainers
* [fairsayan](https://github.com/fairsayan)
* [alexSp84](https://github.com/alexSp84)
* [simonechebelnome](https://github.com/simonechebelnome)

## License

[MIT](https://choosealicense.com/licenses/mit/)
