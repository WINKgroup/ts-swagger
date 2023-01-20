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
        "./routes/api/user.ts"
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
/** 
 * @tsswagger 
 */
```
```ts

// This interface will be converted 
export interface User {
    /** 
     * @tsswagger 
     */
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


Your **APIs** will also need a comment that specifies **which interface they're using, request method and route**, otherwise the swagger for them won't be generated.

```js
/** 
 * @schema User
 * @request GET
 * @route /users
 */

app.get('/users', function(req, res) {
    res.send(Users);
});
```


Other optional comments are the description of the API and its response.

```js
/** 
 * @schema User
 * @request GET
 * @route /users
 * @description Get all users
 * @response_description Array of User
 */

app.get('/users', function(req, res) {
    res.send(Users);
});
```


With the following syntax you can also add the description of status codes other than 200 and if you want with an optional comment, you can provide a reference to the Typescript interface that describes the related response.

```js
/** 
 * @schema User
 * @request GET
 * @route /users/:userId
 * @status_code {404} Not found
 * @status_code {500} Some server error
 * @error_schema Error
 */

app.get('/users/:userId', function(req, res) {
    res.send(User);
});
```


To add query parameters you can use the following syntax (The order of the elements is mandatory). The name and type (number or string) are required.

```js
/** 
 * @query_parameter {name} [type] Description
 */
```

Example:

```js
/** 
 * @schema User
 * @request GET
 * @route /users
 * @query_parameter {start} [number] Starting element
 * @query_parameter {limit} [number] Number of user to return
 */

app.get('/users', function(req, res) {
    res.send(Users);
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
